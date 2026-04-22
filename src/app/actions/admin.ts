'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  isMissingColumnError,
  isPostgrestError,
} from "@/lib/validators/postgrest";
import { sendWinnerNotificationEmail } from "./email";

export type AdminActionResult<T = void> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string }

export type AdminSimulationCandidate = {
  userId: string
  fullName: string
  email: string
  averageScore: number | null
  entryCount: number
}

export type AdminSimulationResult = {
  drawId: string
  mode: 'random' | 'algorithm'
  winnerUserId: string | null
  winningNumbers: number[]
  tierCounts: {
    match3: number
    match4: number
    match5: number
  }
  prizeByTierPence: {
    match3: number
    match4: number
    match5: number
  }
  totalPrizePoolPence: number
  winners: Array<{
    userId: string
    fullName: string
    email: string
    matchCount: 3 | 4 | 5
    matchedNumbers: number[]
    prizePence: number
  }>
  candidates: AdminSimulationCandidate[]
}

async function requireAdminContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false as const, error: 'You must be signed in.' }
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    return { ok: false as const, error: 'Admin access required.' }
  }

  return { ok: true as const, userId: user.id }
}

async function updateProfileRow(userId: string, payload: Record<string, unknown>) {
  const admin = getSupabaseAdminClient()
  const profiles = admin as any

  let { error } = await profiles.from('profiles').update(payload).eq('id', userId)

  if (error && isMissingColumnError(error, 'display_name')) {
    const { display_name: _removed, ...fallbackPayload } = payload
    const fallback = await profiles.from('profiles').update(fallbackPayload).eq('id', userId)
    error = fallback.error
  }

  return error
}

async function syncSubscriptionRow(userId: string, subscriptionStatus: string, subscriptionPatch: Record<string, unknown>) {
  const admin = getSupabaseAdminClient()
  const db = admin as any

  const existing = await db
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing.error) {
    return existing.error
  }

  const payload = {
    user_id: userId,
    status: subscriptionStatus,
    ...subscriptionPatch,
  }

  if (existing.data?.id) {
    const updateResult = await db.from('subscriptions').update(payload).eq('id', existing.data.id)
    return updateResult.error
  }

  const insertResult = await db.from('subscriptions').insert(payload)
  return insertResult.error
}

export async function adminUpdateUserProfile(input: {
  userId: string
  fullName: string
  displayName?: string | null
  role?: 'user' | 'admin'
  subscriptionStatus?: 'inactive' | 'active' | 'cancelled' | 'past_due'
  preferredCharityId?: string | null
  contributionPercent?: number | null
  avatarUrl?: string | null
  planName?: string | null
  amountPence?: number | null
  currentPeriodEnd?: string | null
  cancelAtPeriodEnd?: boolean
}): Promise<AdminActionResult> {
  const adminCheck = await requireAdminContext()
  if (!adminCheck.ok) return adminCheck

  const profilePatch: Record<string, unknown> = {
    full_name: input.fullName.trim(),
  }

  if (input.displayName !== undefined) {
    profilePatch.display_name = input.displayName ? input.displayName.trim() : null
  }

  if (input.role) profilePatch.role = input.role
  if (input.subscriptionStatus) profilePatch.subscription_status = input.subscriptionStatus
  if (input.preferredCharityId !== undefined) profilePatch.preferred_charity_id = input.preferredCharityId
  if (input.contributionPercent !== undefined) profilePatch.contribution_percent = input.contributionPercent
  if (input.avatarUrl !== undefined) profilePatch.avatar_url = input.avatarUrl

  const profileError = await updateProfileRow(input.userId, profilePatch)
  if (profileError) {
    return { ok: false, error: profileError.message }
  }

  if (input.subscriptionStatus || input.planName || input.amountPence !== undefined || input.currentPeriodEnd || input.cancelAtPeriodEnd !== undefined) {
    const subscriptionError = await syncSubscriptionRow(input.userId, input.subscriptionStatus ?? 'inactive', {
      plan_name: input.planName ?? 'Monthly',
      amount_pence: input.amountPence ?? 500,
      current_period_end: input.currentPeriodEnd || null,
      cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
    })

    if (subscriptionError) {
      return { ok: false, error: subscriptionError.message }
    }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/scores')
  revalidatePath('/dashboard/draws')
  revalidatePath('/dashboard/charities')

  return { ok: true, message: 'User profile updated.' }
}

export async function adminUpdateGolfScore(input: {
  scoreId: string
  score: number
  playedAt?: string
  courseName?: string
  notes?: string
}): Promise<AdminActionResult> {
  const adminCheck = await requireAdminContext()
  if (!adminCheck.ok) return adminCheck

  const admin = getSupabaseAdminClient()
  const db = admin as any
  const payload: Record<string, unknown> = {
    score: input.score,
    course_name: input.courseName ?? '',
    notes: input.notes ?? '',
  }

  if (input.playedAt) {
    payload.played_at = input.playedAt.slice(0, 10)
  }

  let { error } = await db.from('golf_scores').update(payload).eq('id', input.scoreId)

  if (error && input.playedAt && isMissingColumnError(error, 'played_at')) {
    const { played_at: _removed, ...fallbackPayload } = payload
    const fallback = await db.from('golf_scores').update({ ...fallbackPayload, round_date: input.playedAt.slice(0, 10) }).eq('id', input.scoreId)
    error = fallback.error
  }

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/scores')
  return { ok: true, message: 'Golf score updated.' }
}

export async function adminDeleteGolfScore(scoreId: string): Promise<AdminActionResult> {
  const adminCheck = await requireAdminContext()
  if (!adminCheck.ok) return adminCheck

  const admin = getSupabaseAdminClient()
  const { error } = await (admin as any).from('golf_scores').delete().eq('id', scoreId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/scores')
  return { ok: true, message: 'Golf score deleted.' }
}

export async function adminAddCharity(input: {
  name: string
  description?: string
  logoUrl?: string
  websiteUrl?: string
  isActive?: boolean
}): Promise<AdminActionResult> {
  const adminCheck = await requireAdminContext()
  if (!adminCheck.ok) return adminCheck

  const admin = getSupabaseAdminClient()
  const { error } = await (admin as any).from('charities').insert({
    name: input.name.trim(),
    description: input.description ?? '',
    logo_url: input.logoUrl ?? '',
    website_url: input.websiteUrl ?? '',
    is_active: input.isActive ?? true,
    total_raised_pence: 0,
    created_by: adminCheck.userId,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/charities')
  revalidatePath('/dashboard/settings')
  return { ok: true, message: 'Charity created.' }
}

export async function adminUpdateCharity(input: {
  charityId: string
  name: string
  description?: string
  logoUrl?: string
  websiteUrl?: string
  isActive?: boolean
}): Promise<AdminActionResult> {
  const adminCheck = await requireAdminContext()
  if (!adminCheck.ok) return adminCheck

  const admin = getSupabaseAdminClient()
  const { error } = await (admin as any)
    .from('charities')
    .update({
      name: input.name.trim(),
      description: input.description ?? '',
      logo_url: input.logoUrl ?? '',
      website_url: input.websiteUrl ?? '',
      is_active: input.isActive ?? true,
    })
    .eq('id', input.charityId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/charities')
  revalidatePath('/dashboard/settings')
  return { ok: true, message: 'Charity updated.' }
}

export async function adminDeleteCharity(charityId: string): Promise<AdminActionResult> {
  const adminCheck = await requireAdminContext()
  if (!adminCheck.ok) return adminCheck

  const admin = getSupabaseAdminClient()
  const { error } = await (admin as any).from('charities').delete().eq('id', charityId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/charities')
  revalidatePath('/dashboard/settings')
  return { ok: true, message: 'Charity deleted.' }
}

export async function adminSetDrawLogicMode(mode: 'random' | 'algorithm'): Promise<AdminActionResult> {
  const adminCheck = await requireAdminContext()
  if (!adminCheck.ok) return adminCheck

  const admin = getSupabaseAdminClient()
  const { error } = await (admin as any)
    .from('admin_settings')
    .upsert({ id: 1, draw_logic_mode: mode })

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin')
  return { ok: true, message: 'Draw logic updated.' }
}

export async function adminCreateDraw(input: {
  charityId: string
  title: string
  description?: string
  drawDate: string
  prizeDescription?: string
}): Promise<AdminActionResult> {
  const adminCheck = await requireAdminContext()
  if (!adminCheck.ok) return adminCheck

  const admin = getSupabaseAdminClient()
  const db = admin as any
  let { error } = await db.from('draws').insert({
    charity_id: input.charityId,
    title: input.title.trim(),
    description: input.description ?? '',
    draw_date: input.drawDate,
    prize_description: input.prizeDescription ?? '',
    status: 'upcoming',
    is_published: false,
    total_prize_pool_pence: 0,
    created_by: adminCheck.userId,
  })

  if (error && isMissingColumnError(error, 'is_published')) {
    const fallback = await db.from('draws').insert({
      charity_id: input.charityId,
      title: input.title.trim(),
      description: input.description ?? '',
      draw_date: input.drawDate,
      prize_description: input.prizeDescription ?? '',
      status: 'upcoming',
      created_by: adminCheck.userId,
    })
    error = fallback.error
  }

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/draws')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/draws')
  return { ok: true, message: 'Draw created.' }
}

function generateWinningNumbers() {
  const numbers = new Set<number>()
  while (numbers.size < 5) {
    numbers.add(Math.floor(Math.random() * 45) + 1)
  }
  return Array.from(numbers).sort((a, b) => a - b)
}

function resolveScoreDate(score: any) {
  return score.played_at ?? score.round_date ?? score.created_at ?? ''
}

async function calculateDrawPoolPence(db: any) {
  const [profilesRes, subscriptionsRes] = await Promise.all([
    db.from('profiles').select('id, subscription_status').eq('subscription_status', 'active'),
    db.from('subscriptions').select('user_id, amount_pence, status').eq('status', 'active'),
  ])

  const activeProfiles = (profilesRes.data ?? []) as Array<{ id: string; subscription_status: string }>
  const activeProfileIds = new Set(activeProfiles.map((profile) => profile.id))
  const activeSubscriptions = (subscriptionsRes.data ?? []) as Array<{ user_id: string; amount_pence: number }>
  const subscriptionAmounts = activeSubscriptions
    .filter((subscription) => activeProfileIds.has(subscription.user_id))
    .map((subscription) => subscription.amount_pence)
    .filter((value) => Number.isFinite(value) && value > 0)

  const baseFeePence = subscriptionAmounts.length
    ? Math.round(subscriptionAmounts.reduce((sum, value) => sum + value, 0) / subscriptionAmounts.length)
    : 500

  return activeProfiles.length * Math.round(baseFeePence * 0.4)
}

async function computeSimulationResult(db: any, drawId: string, mode: 'random' | 'algorithm', providedNumbers?: number[]): Promise<AdminActionResult<AdminSimulationResult>> {
  const [drawResult, profilesResult, scoresResult] = await Promise.all([
    db.from('draws').select('id, title').eq('id', drawId).maybeSingle(),
    db.from('profiles').select('id, full_name, display_name'),
    db.from('golf_scores').select('id, user_id, score, played_at, round_date, created_at'),
  ])

  if (drawResult.error || !drawResult.data) {
    return { ok: false, error: drawResult.error?.message ?? 'Draw not found.' }
  }

  if (profilesResult.error) {
    return { ok: false, error: profilesResult.error.message }
  }

  if (scoresResult.error) {
    return { ok: false, error: scoresResult.error.message }
  }

  const winningNumbers = (providedNumbers?.length === 5 ? [...new Set(providedNumbers)] : generateWinningNumbers()).sort((a, b) => a - b)
  if (winningNumbers.length !== 5) {
    return { ok: false, error: 'Winning numbers must contain 5 unique values.' }
  }

  const winningSet = new Set(winningNumbers)
  const profiles = (profilesResult.data ?? []) as Array<{ id: string; full_name: string | null; display_name?: string | null }>
  const scores = (scoresResult.data ?? []) as Array<any>
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
  const scoreMap = new Map<string, Array<{ score: number; played_at?: string; round_date?: string; created_at?: string }>>()

  for (const score of scores) {
    if (!scoreMap.has(score.user_id)) scoreMap.set(score.user_id, [])
    scoreMap.get(score.user_id)!.push(score)
  }

  const tierUsers: Record<3 | 4 | 5, Array<{ userId: string; fullName: string; matchCount: 3 | 4 | 5; matchedNumbers: number[] }>> = {
    3: [],
    4: [],
    5: [],
  }

  const candidates: AdminSimulationCandidate[] = []

  for (const [userId, userScores] of scoreMap.entries()) {
    const latestFive = [...userScores]
      .sort((a, b) => new Date(resolveScoreDate(b)).getTime() - new Date(resolveScoreDate(a)).getTime())
      .slice(0, 5)

    if (latestFive.length < 5) continue

    const numericScores = latestFive.map((item) => Number(item.score)).filter((value) => Number.isFinite(value))
    const uniqueScores = [...new Set(numericScores)]
    const matchedNumbers = uniqueScores.filter((value) => winningSet.has(value)).sort((a, b) => a - b)
    const matchCount = matchedNumbers.length as 0 | 1 | 2 | 3 | 4 | 5

    const averageScore = numericScores.length
      ? Number((numericScores.reduce((sum, value) => sum + value, 0) / numericScores.length).toFixed(2))
      : null

    const profile = profileMap.get(userId)
    const fullName = profile?.full_name || profile?.display_name || 'User'

    candidates.push({
      userId,
      fullName,
      email: '',
      averageScore,
      entryCount: 1,
    })

    if (matchCount >= 3) {
      const tier = matchCount as 3 | 4 | 5
      tierUsers[tier].push({
        userId,
        fullName,
        matchCount: tier,
        matchedNumbers,
      })
    }
  }

  const totalPrizePoolPence = await calculateDrawPoolPence(db)
  const tierWeights: Record<3 | 4 | 5, number> = { 3: 0.25, 4: 0.35, 5: 0.4 }
  const prizeByTierPence = {
    match3: Math.round(totalPrizePoolPence * tierWeights[3]),
    match4: Math.round(totalPrizePoolPence * tierWeights[4]),
    match5: Math.round(totalPrizePoolPence * tierWeights[5]),
  }

  const winners: AdminSimulationResult['winners'] = []
  ;([3, 4, 5] as const).forEach((tier) => {
    const usersInTier = tierUsers[tier]
    if (usersInTier.length === 0) return

    const tierPool = tier === 3 ? prizeByTierPence.match3 : tier === 4 ? prizeByTierPence.match4 : prizeByTierPence.match5
    const splitPrize = Math.floor(tierPool / usersInTier.length)

    usersInTier.forEach((winner) => {
      winners.push({
        userId: winner.userId,
        fullName: winner.fullName,
        email: '',
        matchCount: tier,
        matchedNumbers: winner.matchedNumbers,
        prizePence: splitPrize,
      })
    })
  })

  const fallbackWinner = winners.find((winner) => winner.matchCount === 5)
    ?? winners.find((winner) => winner.matchCount === 4)
    ?? winners.find((winner) => winner.matchCount === 3)
    ?? null

  return {
    ok: true,
    data: {
      drawId,
      mode,
      winnerUserId: fallbackWinner?.userId ?? null,
      winningNumbers,
      tierCounts: {
        match3: tierUsers[3].length,
        match4: tierUsers[4].length,
        match5: tierUsers[5].length,
      },
      prizeByTierPence,
      totalPrizePoolPence,
      winners,
      candidates,
    },
  }
}

export async function adminSimulateDraw(drawId: string, mode: 'random' | 'algorithm' = 'random'): Promise<AdminActionResult<AdminSimulationResult>> {
  const adminCheck = await requireAdminContext()
  if (!adminCheck.ok) return adminCheck

  const admin = getSupabaseAdminClient()
  const db = admin as any

  return computeSimulationResult(db, drawId, mode)
}

export async function adminPublishDrawResult(input: {
  drawId: string
  winnerUserId?: string
  winningNumbers?: number[]
}): Promise<AdminActionResult> {
  const adminCheck = await requireAdminContext()
  if (!adminCheck.ok) return adminCheck

  const admin = getSupabaseAdminClient()
  const db = admin as any
  const simulation = input.winningNumbers?.length === 5
    ? await computeSimulationResult(db, input.drawId, 'random', input.winningNumbers)
    : null

  if (simulation && !simulation.ok) {
    return simulation
  }

  const derivedWinnerId = simulation?.ok ? simulation.data?.winnerUserId : null
  const winnerUserId = input.winnerUserId ?? derivedWinnerId ?? null
  const winningNumbers = simulation?.ok ? simulation.data?.winningNumbers : input.winningNumbers
  const totalPrizePoolPence = simulation?.ok ? simulation.data?.totalPrizePoolPence ?? 0 : 0

  let { error } = await db
    .from('draws')
    .update({
      winner_user_id: winnerUserId,
      winner_announced_at: new Date().toISOString(),
      status: 'completed',
      is_published: true,
      winning_numbers: winningNumbers ?? null,
      total_prize_pool_pence: totalPrizePoolPence,
    })
    .eq('id', input.drawId)

  if (error && isMissingColumnError(error, 'is_published')) {
    const fallback = await db
      .from('draws')
      .update({
        winner_user_id: winnerUserId,
        winner_announced_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', input.drawId)
    error = fallback.error
  }

  if (error) {
    console.error('Failed to publish draw:', error)
    return { ok: false, error: 'Failed to publish draw results.' }
  }

  // Insert winners into the winners table
  if (simulation?.ok && simulation.data && simulation.data.winners.length > 0) {
    const winnerRecords = simulation.data.winners.map(w => ({
      draw_id: input.drawId,
      user_id: w.userId,
      tier: w.matchCount,
      match_count: w.matchCount,
      matched_numbers: w.matchedNumbers,
      prize_pence: w.prizePence,
    }))

    const { error: winnerInsertError } = await db.from('winners').insert(winnerRecords)

    if (winnerInsertError) {
      console.error('Failed to insert winners:', winnerInsertError)
      // Don't block on this, but log it
    }
  }

  // Send winner notification emails
  if (simulation?.ok && simulation.data.winners.length > 0) {
    const { data: draw } = await db.from('draws').select('draw_date').eq('id', input.drawId).single();
    const drawDate = draw ? new Date(draw.draw_date).toLocaleDateString() : 'a recent draw';

    for (const winner of simulation.data.winners) {
      await sendWinnerNotificationEmail(
        winner.userId,
        winner.matchCount,
        `£${(winner.prizePence / 100).toFixed(2)}`,
        drawDate,
        winningNumbers ?? []
      );
    }
  }

  return { ok: true }
}

export async function adminVerifyWinnerSubmission(input: {
  drawId: string
  userId: string
}): Promise<AdminActionResult> {
  const adminCheck = await requireAdminContext()
  if (!adminCheck.ok) return adminCheck

  const admin = getSupabaseAdminClient()
  const { error } = await (admin as any)
    .from('draw_entries')
    .update({ verified: true })
    .eq('draw_id', input.drawId)
    .eq('user_id', input.userId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin')
  return { ok: true, message: 'Submission verified.' }
}

export async function adminMarkPayoutCompleted(drawId: string): Promise<AdminActionResult> {
  const adminCheck = await requireAdminContext()
  if (!adminCheck.ok) return adminCheck

  const admin = getSupabaseAdminClient()
  const { error } = await (admin as any)
    .from('draws')
    .update({ payout_completed: true })
    .eq('id', drawId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/draws')
  return { ok: true, message: 'Payout marked as completed.' }
}
