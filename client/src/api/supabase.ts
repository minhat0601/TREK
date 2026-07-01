import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseUrl = (rawUrl && rawUrl.startsWith('http')) ? rawUrl : 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

if (!rawUrl || rawUrl === 'your-supabase-project-url') {
  console.warn(
    'Warning: Supabase keys are not configured or are using placeholder values. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your client/.env file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
