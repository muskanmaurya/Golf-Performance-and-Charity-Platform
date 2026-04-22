import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import DrawsPageClient from './DrawsPageClient'
import type { Draw, Charity } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DrawsPage() {
  const admin = getSupabaseAdminClient()
  const db = admin as any

  const [drawsRes, charitiesRes, entriesRes, settingsRes] = await Promise.all([
    db.from('draws').select('*').order('draw_date', { ascending: false }),
    db.from('charities').select('*'),
    db.from('draw_entries').select('*'),
    db.from('admin_settings').select('draw_logic_mode').eq('id', 1).maybeSingle(),
  ])

  const draws = (drawsRes.data ?? []) as Draw[]
  const charities = (charitiesRes.data ?? []) as Charity[]
  const entries = (entriesRes.data ?? []) as any[]
  const drawLogicMode = (settingsRes.data?.draw_logic_mode ?? 'random') as 'random' | 'algorithm'

  const drawsWithEntries = draws.map((draw) => ({
    ...draw,
    entryCount: entries.filter((e) => e.draw_id === draw.id).length,
  }))

  return (
    <DrawsPageClient
      draws={drawsWithEntries}
      charities={charities}
      drawLogicMode={drawLogicMode}
    />
  )
}
