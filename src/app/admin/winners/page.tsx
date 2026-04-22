import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import WinnersPageClient from './WinnersPageClient'
import type { Draw, Profile, Charity } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function WinnersPage() {
  const admin = getSupabaseAdminClient()
  const db = admin as any

  const [drawsRes, profilesRes, charitiesRes, entriesRes] = await Promise.all([
    db.from('draws').select('*').neq('winner_user_id', null).order('winner_announced_at', { ascending: false }),
    db.from('profiles').select('*'),
    db.from('charities').select('*'),
    db.from('draw_entries').select('*'),
  ])

  const draws = (drawsRes.data ?? []) as Draw[]
  const profiles = (profilesRes.data ?? []) as Profile[]
  const charities = (charitiesRes.data ?? []) as Charity[]
  const entries = (entriesRes.data ?? []) as any[]

  const profileMap = new Map(profiles.map((p) => [p.id, p]))
  const charityMap = new Map(charities.map((c) => [c.id, c]))

  const winners = draws.map((draw) => ({
    ...draw,
    winner: draw.winner_user_id ? profileMap.get(draw.winner_user_id) ?? null : null,
    charity: charityMap.get(draw.charity_id) ?? undefined,
    entryCount: entries.filter((e) => e.draw_id === draw.id).length,
  }))

  return <WinnersPageClient winners={winners as any} />
}
