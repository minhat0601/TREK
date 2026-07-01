const PROBE_INTERVAL_MS = 30_000
const PROBE_TIMEOUT_MS = 1_500

let reachable = true
const listeners = new Set<(v: boolean) => void>()

function setReachable(v: boolean): void {
  if (reachable === v) return
  reachable = v
  listeners.forEach(fn => fn(v))
}

async function probe(): Promise<void> {
  if (!navigator.onLine) { setReachable(false); return }
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS)
    const url = import.meta.env.VITE_SUPABASE_URL || window.location.origin
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: ctrl.signal,
    })
    clearTimeout(t)
    const ct = res.headers.get('content-type') || ''
    setReachable(res.ok && (ct.includes('application/json') || ct.includes('text/html')))
  } catch {
    setReachable(false)
  }
}

export function startConnectivityProbe(): void {
  probe()
  setInterval(probe, PROBE_INTERVAL_MS)
  window.addEventListener('online', probe)
  window.addEventListener('offline', () => setReachable(false))
}

export function isReachable(): boolean { return reachable }
export function probeNow(): Promise<void> { return probe() }
export function onChange(fn: (v: boolean) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
