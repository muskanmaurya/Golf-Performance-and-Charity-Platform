import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import UsersPageClient from './UsersPageClient'
import type { Charity, Profile, Subscription } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function UsersPage() {
  const admin = getSupabaseAdminClient()
  const db = admin as any

  const [profilesRes, scoresRes, charitiesRes, subscriptionsRes, drawsRes, entriesRes, authUsersRes] = await Promise.all([
    db.from('profiles').select('*').order('created_at', { ascending: false }),
    db.from('golf_scores').select('*').order('created_at', { ascending: false }),
    db.from('charities').select('*').order('created_at', { ascending: false }),
    db.from('subscriptions').select('*'),
    db.from('draws').select('id,title,winner_user_id,winner_announced_at').neq('winner_user_id', null),
    db.from('draw_entries').select('*'),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const fallbackProfilesRes = profilesRes.error ? await db.from('profiles').select('*') : null
  const fallbackScoresRes = scoresRes.error ? await db.from('golf_scores').select('*') : null
  const fallbackCharitiesRes = charitiesRes.error ? await db.from('charities').select('*') : null

  const profiles = ((fallbackProfilesRes?.data ?? profilesRes.data) ?? []) as Array<Profile & { email?: string | null }>
  const scores = (scoresRes.data ?? []) as Array<any>
  const charities = ((fallbackCharitiesRes?.data ?? charitiesRes.data) ?? []) as Charity[]
  const subscriptions = (subscriptionsRes.data ?? []) as Subscription[]
  const draws = (drawsRes.data ?? []) as Array<{
    id: string
    title: string
    winner_user_id: string | null
    winner_announced_at: string | null
  }>
  const entries = (entriesRes.data ?? []) as Array<Record<string, any>>
  const authUsers = authUsersRes.data?.users ?? []

  const scoresSafe = (fallbackScoresRes?.data ?? scores) as Array<any>

  const authEmailMap = new Map(
    authUsers.map((authUser) => [authUser.id, authUser.email ?? (authUser.user_metadata?.email as string | undefined) ?? ''])
  )

  const subscriptionMap = new Map(subscriptions.map((s) => [s.user_id, s]))
  const scoreMap = new Map<string, any[]>()
  scoresSafe.forEach((score) => {
    if (!scoreMap.has(score.user_id)) scoreMap.set(score.user_id, [])
    scoreMap.get(score.user_id)!.push(score)
  })

  const proofMap = new Map<string, Array<{
    drawId: string
    drawTitle: string
    winnerAnnouncedAt: string | null
    verified: boolean
    proofUrl: string | null
  }>>()

  draws.forEach((draw) => {
    const winnerId = draw.winner_user_id
    if (!winnerId) return

    const winnerEntry = entries.find((entry) => entry.draw_id === draw.id && entry.user_id === winnerId)
    const record = {
      drawId: draw.id,
      drawTitle: draw.title,
      winnerAnnouncedAt: draw.winner_announced_at,
      verified: Boolean(winnerEntry?.verified),
      proofUrl: typeof winnerEntry?.proof_url === 'string' ? winnerEntry.proof_url : null,
    }

    if (!proofMap.has(winnerId)) proofMap.set(winnerId, [])
    proofMap.get(winnerId)!.push(record)
  })

  const users = profiles.map((profile) => ({
    ...profile,
    email: profile.email ?? authEmailMap.get(profile.id) ?? '',
    subscription: subscriptionMap.get(profile.id) ?? null,
    scores: scoreMap.get(profile.id) ?? [],
    scoreCount: (scoreMap.get(profile.id) ?? []).length,
    winnerProofs: proofMap.get(profile.id) ?? [],
  }))

  return (
    <UsersPageClient
      users={users}
      charities={charities}
      allScores={scoresSafe}
    />
  )
}
