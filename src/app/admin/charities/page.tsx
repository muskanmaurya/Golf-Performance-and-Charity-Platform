import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import CharitiesPageClient from './CharitiesPageClient'
import type { Charity } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CharitiesPage() {
  const admin = getSupabaseAdminClient()
  const db = admin as any

  const charitiesRes = await db.from('charities').select('*').order('created_at', { ascending: false })

  const charities = (charitiesRes.data ?? []) as Charity[]

  return <CharitiesPageClient charities={charities} />
}
