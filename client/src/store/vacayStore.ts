import { create } from 'zustand'
import { supabase } from '../api/supabase'
import type { VacayPlan, VacayUser, VacayEntry, VacayStat, HolidaysMap, HolidayInfo, VacayHolidayCalendar } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get or create the vacay_plan for the current user */
async function ensurePlan(): Promise<{ plan: any; isMember: boolean }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: ownPlan } = await supabase
    .from('vacay_plans')
    .select('*, vacay_holiday_calendars(*)')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (ownPlan) return { plan: ownPlan, isMember: false }

  const { data: memberRow } = await supabase
    .from('vacay_plan_members')
    .select('plan_id')
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .maybeSingle()

  if (memberRow) {
    const { data: memberPlan } = await supabase
      .from('vacay_plans')
      .select('*, vacay_holiday_calendars(*)')
      .eq('id', memberRow.plan_id)
      .single()
    if (memberPlan) return { plan: memberPlan, isMember: true }
  }

  const { data: newPlan, error } = await supabase
    .from('vacay_plans')
    .insert([{ owner_id: user.id }])
    .select('*, vacay_holiday_calendars(*)')
    .single()
  if (error) throw error
  return { plan: newPlan, isMember: false }
}

function mapPlan(plan: any): VacayPlan {
  return {
    id: plan.id,
    holidays_enabled: plan.holidays_enabled,
    holidays_region: plan.holidays_region,
    holiday_calendars: plan.vacay_holiday_calendars || [],
    block_weekends: plan.block_weekends,
    carry_over_enabled: plan.carry_over_enabled,
    company_holidays_enabled: plan.company_holidays_enabled,
  }
}

// ---------------------------------------------------------------------------
// Vacay API (Supabase-native, replaces all NestJS axios calls)
// ---------------------------------------------------------------------------

const vacayApi = {
  getPlan: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { plan, isMember } = await ensurePlan()

    const { data: memberRows } = await supabase
      .from('vacay_plan_members')
      .select('user_id, status')
      .eq('plan_id', plan.id)

    const allUserIds = [plan.owner_id, ...(memberRows || []).filter((m: any) => m.status === 'accepted').map((m: any) => m.user_id)]
    const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', allUserIds)
    const { data: colorRows } = await supabase.from('vacay_user_colors').select('user_id, color').eq('plan_id', plan.id)
    const colorMap = new Map((colorRows || []).map((c: any) => [c.user_id, c.color]))

    const users: VacayUser[] = (profiles || []).map((p: any) => ({
      id: p.id, username: p.username, color: colorMap.get(p.id) || null,
    }))

    const pending = (memberRows || []).filter((m: any) => m.status === 'pending')
    const pendingIds = pending.map((m: any) => m.user_id)
    const { data: pendingProfiles } = pendingIds.length > 0
      ? await supabase.from('profiles').select('id, username').in('id', pendingIds)
      : { data: [] }
    const pendingInvites = (pendingProfiles || []).map((p: any) => ({ user_id: p.id, username: p.username }))

    const { data: incomingRows } = await supabase
      .from('vacay_plan_members')
      .select('plan_id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
    const incomingInvites = await Promise.all(
      (incomingRows || []).map(async (row: any) => {
        const { data: ownerPlan } = await supabase.from('vacay_plans').select('owner_id').eq('id', row.plan_id).single()
        const { data: ownerProfile } = ownerPlan
          ? await supabase.from('profiles').select('username').eq('id', ownerPlan.owner_id).single()
          : { data: null }
        return { plan_id: row.plan_id, owner_username: ownerProfile?.username || '' }
      })
    )

    return {
      plan: mapPlan(plan), users, pendingInvites, incomingInvites,
      isOwner: !isMember, isFused: users.length > 1,
    }
  },

  updatePlan: async (data: Partial<VacayPlan>) => {
    const { plan } = await ensurePlan()
    const { data: updated, error } = await supabase
      .from('vacay_plans')
      .update({
        block_weekends: data.block_weekends,
        holidays_enabled: data.holidays_enabled,
        holidays_region: data.holidays_region,
        company_holidays_enabled: data.company_holidays_enabled,
        carry_over_enabled: data.carry_over_enabled,
      })
      .eq('id', plan.id)
      .select('*, vacay_holiday_calendars(*)')
      .single()
    if (error) throw error
    return { plan: mapPlan(updated) }
  },

  updateColor: async (color: string, targetUserId?: string | number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { plan } = await ensurePlan()
    const uid = targetUserId ? String(targetUserId) : user.id
    const { error } = await supabase.from('vacay_user_colors')
      .upsert({ user_id: uid, plan_id: plan.id, color }, { onConflict: 'user_id,plan_id' })
    if (error) throw error
    return { success: true }
  },

  invite: async (userId: string | number) => {
    const { plan } = await ensurePlan()
    const { error } = await supabase.from('vacay_plan_members')
      .upsert({ plan_id: plan.id, user_id: String(userId), status: 'pending' }, { onConflict: 'plan_id,user_id' })
    if (error) throw error
    return { success: true }
  },

  acceptInvite: async (planId: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase.from('vacay_plan_members')
      .update({ status: 'accepted' }).eq('plan_id', planId).eq('user_id', user.id)
    if (error) throw error
    return { success: true }
  },

  declineInvite: async (planId: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase.from('vacay_plan_members')
      .delete().eq('plan_id', planId).eq('user_id', user.id)
    if (error) throw error
    return { success: true }
  },

  cancelInvite: async (userId: string | number) => {
    const { plan } = await ensurePlan()
    const { error } = await supabase.from('vacay_plan_members')
      .delete().eq('plan_id', plan.id).eq('user_id', String(userId))
    if (error) throw error
    return { success: true }
  },

  dissolve: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data: ownPlan } = await supabase.from('vacay_plans').select('id').eq('owner_id', user.id).maybeSingle()
    if (ownPlan) {
      await supabase.from('vacay_plan_members').delete().eq('plan_id', ownPlan.id)
    } else {
      const { data: membership } = await supabase.from('vacay_plan_members').select('plan_id').eq('user_id', user.id).maybeSingle()
      if (membership) {
        await supabase.from('vacay_plan_members').delete().eq('user_id', user.id).eq('plan_id', membership.plan_id)
      }
    }
    return { success: true }
  },

  availableUsers: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { plan } = await ensurePlan()
    const { data: memberRows } = await supabase.from('vacay_plan_members').select('user_id').eq('plan_id', plan.id)
    const excludedIds = [user.id, ...(memberRows || []).map((m: any) => m.user_id)]
    const { data: profiles } = await supabase.from('profiles').select('id, username')
      .not('id', 'in', `(${excludedIds.map(id => `'${id}'`).join(',')})`)
      .limit(50)
    return { users: (profiles || []).map((p: any) => ({ id: p.id, username: p.username, color: null })) as VacayUser[] }
  },

  getYears: async () => {
    const { plan } = await ensurePlan()
    const { data, error } = await supabase.from('vacay_years').select('year').eq('plan_id', plan.id).order('year', { ascending: true })
    if (error) throw error
    return { years: (data || []).map((r: any) => r.year) }
  },

  addYear: async (year: number) => {
    const { plan } = await ensurePlan()
    await supabase.from('vacay_years').upsert({ plan_id: plan.id, year }, { onConflict: 'plan_id,year' })
    return vacayApi.getYears()
  },

  removeYear: async (year: number) => {
    const { plan } = await ensurePlan()
    await supabase.from('vacay_years').delete().eq('plan_id', plan.id).eq('year', year)
    return vacayApi.getYears()
  },

  getEntries: async (year: number) => {
    const { plan } = await ensurePlan()
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`
    const { data: entries, error } = await supabase.from('vacay_entries')
      .select('user_id, date, plan_id').eq('plan_id', plan.id).gte('date', startDate).lte('date', endDate)
    if (error) throw error
    const { data: compHolidays } = await supabase.from('vacay_company_holidays')
      .select('date, note').eq('plan_id', plan.id).gte('date', startDate).lte('date', endDate)
    return {
      entries: (entries || []).map((e: any) => ({ date: e.date, user_id: e.user_id, plan_id: e.plan_id })) as VacayEntry[],
      companyHolidays: (compHolidays || []).map((h: any) => ({ date: h.date, note: h.note }))
    }
  },

  toggleEntry: async (date: string, targetUserId?: string | number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { plan } = await ensurePlan()
    const uid = targetUserId ? String(targetUserId) : user.id
    const { data: existing } = await supabase.from('vacay_entries').select('id')
      .eq('plan_id', plan.id).eq('user_id', uid).eq('date', date).maybeSingle()
    if (existing) {
      await supabase.from('vacay_entries').delete().eq('id', existing.id)
    } else {
      await supabase.from('vacay_entries').insert({ plan_id: plan.id, user_id: uid, date })
    }
    return { success: true }
  },

  toggleCompanyHoliday: async (date: string) => {
    const { plan } = await ensurePlan()
    const { data: existing } = await supabase.from('vacay_company_holidays').select('id')
      .eq('plan_id', plan.id).eq('date', date).maybeSingle()
    if (existing) {
      await supabase.from('vacay_company_holidays').delete().eq('id', existing.id)
    } else {
      await supabase.from('vacay_company_holidays').insert({ plan_id: plan.id, date })
    }
    return { success: true }
  },

  getStats: async (year: number) => {
    const { plan } = await ensurePlan()
    const { data: memberRows } = await supabase.from('vacay_plan_members')
      .select('user_id').eq('plan_id', plan.id).eq('status', 'accepted')
    const allUserIds = [plan.owner_id, ...(memberRows || []).map((m: any) => m.user_id)]
    const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', allUserIds)
    const { data: colors } = await supabase.from('vacay_user_colors').select('user_id, color').eq('plan_id', plan.id)
    const { data: userYears } = await supabase.from('vacay_user_years')
      .select('user_id, vacation_days, carried_over').eq('plan_id', plan.id).eq('year', year)
    const { data: entries } = await supabase.from('vacay_entries').select('user_id')
      .eq('plan_id', plan.id).gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)

    const usedMap = new Map<string, number>()
    for (const e of (entries || [])) { usedMap.set(e.user_id, (usedMap.get(e.user_id) || 0) + 1) }
    const colorMap = new Map((colors || []).map((c: any) => [c.user_id, c.color]))
    const yearMap = new Map((userYears || []).map((r: any) => [r.user_id, r]))

    const stats: VacayStat[] = (profiles || []).map((p: any) => {
      const yearData = yearMap.get(p.id)
      const vacationDays = yearData?.vacation_days ?? 30
      const carriedOver = yearData?.carried_over ?? 0
      const used = usedMap.get(p.id) || 0
      return {
        user_id: p.id, person_name: p.username, person_color: colorMap.get(p.id) || '#6366f1',
        year, vacation_days: vacationDays, carried_over: carriedOver,
        total_available: vacationDays + carriedOver, used, remaining: vacationDays + carriedOver - used,
      }
    })
    return { stats }
  },

  updateStats: async (year: number, days: number, targetUserId?: string | number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { plan } = await ensurePlan()
    const uid = targetUserId ? String(targetUserId) : user.id
    const { error } = await supabase.from('vacay_user_years')
      .upsert({ user_id: uid, plan_id: plan.id, year, vacation_days: days }, { onConflict: 'user_id,plan_id,year' })
    if (error) throw error
    return { success: true }
  },

  getCountries: async () => {
    return {
      countries: [
        'AD','AE','AG','AL','AM','AR','AT','AU','AZ','BA','BB','BD','BE','BG','BH','BO','BR','BS',
        'BT','BW','BY','BZ','CA','CH','CI','CL','CM','CN','CO','CR','CU','CV','CY','CZ','DE','DJ',
        'DK','DM','DO','DZ','EC','EE','EG','ES','ET','FI','FJ','FR','GA','GB','GD','GE','GH','GR',
        'GT','GY','HN','HR','HT','HU','ID','IE','IL','IN','IQ','IR','IS','IT','JM','JO','JP','KE',
        'KG','KH','KP','KR','KW','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA',
        'MC','MD','ME','MG','MK','ML','MM','MN','MT','MU','MV','MW','MX','MY','MZ','NA','NG','NI',
        'NL','NO','NP','NZ','OM','PA','PE','PG','PH','PK','PL','PT','PY','QA','RO','RS','RU','RW',
        'SA','SB','SC','SD','SE','SG','SI','SK','SL','SM','SN','SO','SR','SS','ST','SV','SY','SZ',
        'TD','TG','TH','TN','TO','TR','TT','TZ','UA','UG','US','UY','UZ','VC','VE','VN','WS','YE',
        'ZA','ZM','ZW'
      ]
    }
  },

  getHolidays: async (year: number, country: string) => {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`)
    if (!response.ok) return []
    return response.json()
  },

  addHolidayCalendar: async (data: { region: string; color?: string; label?: string | null }) => {
    const { plan } = await ensurePlan()
    const { data: cal, error } = await supabase.from('vacay_holiday_calendars')
      .insert({ plan_id: plan.id, region: data.region, color: data.color || '#fecaca', label: data.label || null })
      .select().single()
    if (error) throw error
    return { calendar: cal as VacayHolidayCalendar }
  },

  updateHolidayCalendar: async (id: number, data: { region?: string; color?: string; label?: string | null }) => {
    const { data: cal, error } = await supabase.from('vacay_holiday_calendars').update(data).eq('id', id).select().single()
    if (error) throw error
    return { calendar: cal as VacayHolidayCalendar }
  },

  deleteHolidayCalendar: async (id: number) => {
    const { error } = await supabase.from('vacay_holiday_calendars').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface PendingInvite { user_id: string; username: string }
interface IncomingInvite { plan_id: number; owner_username: string }

interface VacayState {
  plan: VacayPlan | null
  users: VacayUser[]
  pendingInvites: PendingInvite[]
  incomingInvites: IncomingInvite[]
  isOwner: boolean
  isFused: boolean
  years: number[]
  entries: VacayEntry[]
  companyHolidays: { date: string; note?: string }[]
  stats: VacayStat[]
  selectedYear: number
  selectedUserId: string | number | null
  holidays: HolidaysMap
  loading: boolean

  setSelectedYear: (year: number) => void
  setSelectedUserId: (id: string | number | null) => void
  loadPlan: () => Promise<void>
  updatePlan: (updates: Partial<VacayPlan>) => Promise<void>
  updateColor: (color: string, targetUserId?: string | number) => Promise<void>
  invite: (userId: string | number) => Promise<void>
  acceptInvite: (planId: number) => Promise<void>
  declineInvite: (planId: number) => Promise<void>
  cancelInvite: (userId: string | number) => Promise<void>
  dissolve: () => Promise<void>
  loadYears: () => Promise<void>
  addYear: (year: number) => Promise<void>
  removeYear: (year: number) => Promise<void>
  loadEntries: (year?: number) => Promise<void>
  toggleEntry: (date: string, targetUserId?: string | number) => Promise<void>
  toggleCompanyHoliday: (date: string) => Promise<void>
  loadStats: (year?: number) => Promise<void>
  updateVacationDays: (year: number, days: number, targetUserId?: string | number) => Promise<void>
  loadHolidays: (year?: number) => Promise<void>
  addHolidayCalendar: (data: { region: string; color?: string; label?: string | null }) => Promise<void>
  updateHolidayCalendar: (id: number, data: { region?: string; color?: string; label?: string | null }) => Promise<void>
  deleteHolidayCalendar: (id: number) => Promise<void>
  loadAll: () => Promise<void>
}

export const useVacayStore = create<VacayState>((set, get) => ({
  plan: null, users: [], pendingInvites: [], incomingInvites: [],
  isOwner: true, isFused: false, years: [], entries: [], companyHolidays: [],
  stats: [], selectedYear: new Date().getFullYear(), selectedUserId: null,
  holidays: {}, loading: false,

  setSelectedYear: (year) => set({ selectedYear: year }),
  setSelectedUserId: (id) => set({ selectedUserId: id as any }),

  loadPlan: async () => {
    const data = await vacayApi.getPlan()
    set({ plan: data.plan, users: data.users, pendingInvites: data.pendingInvites,
      incomingInvites: data.incomingInvites, isOwner: data.isOwner, isFused: data.isFused })
  },

  updatePlan: async (updates) => {
    const data = await vacayApi.updatePlan(updates)
    set({ plan: data.plan })
    await get().loadEntries(); await get().loadStats(); await get().loadHolidays()
  },

  updateColor: async (color, targetUserId) => {
    await vacayApi.updateColor(color, targetUserId)
    await get().loadPlan(); await get().loadEntries()
  },

  invite: async (userId) => { await vacayApi.invite(userId); await get().loadPlan() },
  acceptInvite: async (planId) => { await vacayApi.acceptInvite(planId); await get().loadAll() },
  declineInvite: async (planId) => { await vacayApi.declineInvite(planId); await get().loadPlan() },
  cancelInvite: async (userId) => { await vacayApi.cancelInvite(userId); await get().loadPlan() },
  dissolve: async () => { await vacayApi.dissolve(); await get().loadAll() },

  loadYears: async () => {
    const data = await vacayApi.getYears()
    set({ years: data.years })
    if (data.years.length > 0) set({ selectedYear: data.years[data.years.length - 1] })
  },

  addYear: async (year) => { const data = await vacayApi.addYear(year); set({ years: data.years }); await get().loadStats(year) },
  removeYear: async (year) => {
    const data = await vacayApi.removeYear(year)
    const updates: Partial<VacayState> = { years: data.years }
    if (get().selectedYear === year) {
      updates.selectedYear = data.years.length > 0 ? data.years[data.years.length - 1] : new Date().getFullYear()
    }
    set(updates); await get().loadStats()
  },

  loadEntries: async (year?) => {
    const y = year || get().selectedYear
    const data = await vacayApi.getEntries(y)
    set({ entries: data.entries, companyHolidays: data.companyHolidays })
  },

  toggleEntry: async (date, targetUserId) => {
    await vacayApi.toggleEntry(date, targetUserId)
    await get().loadEntries(); await get().loadStats()
  },

  toggleCompanyHoliday: async (date) => {
    await vacayApi.toggleCompanyHoliday(date)
    await get().loadEntries(); await get().loadStats()
  },

  loadStats: async (year?) => {
    const y = year || get().selectedYear
    const data = await vacayApi.getStats(y)
    set({ stats: data.stats })
  },

  updateVacationDays: async (year, days, targetUserId) => {
    await vacayApi.updateStats(year, days, targetUserId)
    await get().loadStats(year)
  },

  loadHolidays: async (year?) => {
    const y = year || get().selectedYear
    const plan = get().plan
    const calendars = plan?.holiday_calendars ?? []
    if (!plan?.holidays_enabled || calendars.length === 0) { set({ holidays: {} }); return }
    const map: HolidaysMap = {}
    for (const cal of calendars) {
      const country = cal.region.split('-')[0]
      const region = cal.region.includes('-') ? cal.region : null
      try {
        const data = await vacayApi.getHolidays(y, country)
        const hasRegions = data.some((h: any) => h.counties && h.counties.length > 0)
        if (hasRegions && !region) continue
        data.forEach((h: any) => {
          if (h.global || !h.counties || (region && h.counties.includes(region))) {
            if (!map[h.date]) {
              map[h.date] = { name: h.name, localName: h.localName, color: cal.color, label: cal.label } as HolidayInfo
            }
          }
        })
      } catch { /* skip */ }
    }
    set({ holidays: map })
  },

  addHolidayCalendar: async (data) => { await vacayApi.addHolidayCalendar(data); await get().loadPlan(); await get().loadHolidays() },
  updateHolidayCalendar: async (id, data) => { await vacayApi.updateHolidayCalendar(id, data); await get().loadPlan(); await get().loadHolidays() },
  deleteHolidayCalendar: async (id) => { await vacayApi.deleteHolidayCalendar(id); await get().loadPlan(); await get().loadHolidays() },

  loadAll: async () => {
    set({ loading: true })
    try {
      await get().loadPlan(); await get().loadYears()
      const year = get().selectedYear
      await get().loadEntries(year); await get().loadStats(year); await get().loadHolidays(year)
    } finally { set({ loading: false }) }
  },
}))
