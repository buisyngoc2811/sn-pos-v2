import { createClient } from '@supabase/supabase-js'

const apply = process.argv.includes('--apply')
const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const email = process.env.LOYALTY_ADMIN_EMAIL
const password = process.env.LOYALTY_ADMIN_PASSWORD

if (!url || !anonKey || !email || !password) {
  console.error('Missing SUPABASE_URL, SUPABASE_ANON_KEY, LOYALTY_ADMIN_EMAIL, or LOYALTY_ADMIN_PASSWORD.')
  process.exit(1)
}

const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

if (signInError) {
  console.error(`Unable to authenticate the enrolled store owner: ${signInError.message}`)
  process.exit(1)
}

const { data, error } = await supabase.rpc('backfill_missing_loyalty_points', { p_apply: apply })

if (error) {
  console.error(`Loyalty-points ${apply ? 'backfill' : 'dry run'} failed: ${error.message}`)
  process.exit(1)
}

const rows = data ?? []
console.table(rows)
console.log(`${apply ? 'Backfill' : 'Dry run'} complete: ${rows.length} eligible order(s).`)
