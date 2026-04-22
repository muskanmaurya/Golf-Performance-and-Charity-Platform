'use client'

import { useMemo, useOptimistic, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  CircleAlert as AlertCircle,
  CircleCheck as CheckCircle2,
  Clock,
  Heart,
  LogOut,
  Lock,
  Settings,
  Target,
  Trophy,
  TrendingUp,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import type { Charity, Draw, GolfScore, Profile } from '@/lib/types'
import { addScore } from '@/app/actions/scores'
import { setPreferredCharity } from '@/app/actions/charity'
import SubscribeButton from '@/components/dashboard/SubscribeButton'

function getStatusBadge(status: string | undefined) {
  if (status === 'active') return <Badge variant="success" className="bg-teal-500/15 text-teal-300 border-teal-400/25">Active</Badge>
  if (!status || status === 'inactive') return <Badge variant="default">Inactive</Badge>
  if (status === 'past_due') return <Badge variant="warning">Past Due</Badge>
  if (status === 'cancelled') return <Badge variant="danger">Cancelled</Badge>
  return <Badge variant="default">{status}</Badge>
}

function scoreDate(score: GolfScore & { round_date?: string | null }): string {
  const rawDate = score.played_at ?? score.round_date ?? new Date().toISOString()
  return rawDate.slice(0, 10)
}

function getAverage(scores: GolfScore[]) {
  if (!scores.length) return null
  return (scores.reduce((sum, s) => sum + s.score, 0) / scores.length).toFixed(1)
}

function formatGBP(amountPence: number) {
  return `£${(amountPence / 100).toFixed(2)}`
}

export default function SubscriberDashboard(props: {
  profile: Profile | null
  scores: GolfScore[]
  charities: Charity[]
  nextDraw: Draw | null
  winningsPence: number
  stripePriceIdMonthly: string
  stripePriceIdYearly: string
}) {
  const { profile, scores, charities, nextDraw, winningsPence, stripePriceIdMonthly, stripePriceIdYearly } = props
  const router = useRouter()

  const [pending, startTransition] = useTransition()
  const [scoreInput, setScoreInput] = useState('')
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [charityModalOpen, setCharityModalOpen] = useState(false)
  const [changingCharity, setChangingCharity] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [avatarBroken, setAvatarBroken] = useState(false)

  const [optimisticScores, setOptimisticScores] = useOptimistic(
    scores,
    (_state, next: GolfScore[]) => next
  )

  const avg = useMemo(() => getAverage(optimisticScores), [optimisticScores])
  const firstName = profile?.full_name?.split(' ')[0] || 'Player'
  const avatarInitial = firstName.trim().charAt(0).toUpperCase() || 'P'
  const subscriptionStatus = profile?.subscription_status ?? 'inactive'
  const isSubscribed = subscriptionStatus === 'active'

  const selectedCharity = useMemo(() => {
    if (!profile?.preferred_charity_id) {
      return charities.find(c => c.name === 'Golf for Change') || charities[0] || null;
    }
    return charities.find(c => c.id === profile.preferred_charity_id) || charities.find(c => c.name === 'Golf for Change') || charities[0] || null;
  }, [charities, profile])

  const contributionPercent =
    typeof profile?.contribution_percent === 'number' && Number.isFinite(profile.contribution_percent)
      ? profile.contribution_percent
      : 10
  const isAdmin = profile?.role === 'admin'

  const nextDrawDate = nextDraw?.draw_date ? new Date(nextDraw.draw_date) : null
  const nextDrawLabel = nextDrawDate
    ? nextDrawDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  function optimisticAdd(score: number, date: string) {
    const now = new Date().toISOString()
    const next: GolfScore = {
      id: `optimistic-${now}`,
      user_id: profile?.id ?? '',
      score,
      played_at: date,
      course_name: '',
      notes: '',
      created_at: now,
    }

    const merged = [next, ...optimisticScores]
      .sort((a, b) => scoreDate(b).localeCompare(scoreDate(a)))
      .slice(0, 5)

    setOptimisticScores(merged)
  }

  async function onSubmitScore(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const scoreNum = parseInt(scoreInput, 10)
    if (Number.isNaN(scoreNum) || scoreNum < 1 || scoreNum > 45) {
      setError('Score must be between 1 and 45.')
      return
    }

    const date = playedAt.slice(0, 10)
    if (optimisticScores.some((s) => scoreDate(s) === date)) {
      setError('You already have a score for that date.')
      return
    }

    optimisticAdd(scoreNum, date)

    startTransition(async () => {
      const res = await addScore(scoreNum, date)
      if (!res.ok) {
        setError(res.error)
        router.refresh()
        return
      }
      setSuccessMsg('Score added.')
      setScoreInput('')
      setTimeout(() => setSuccessMsg(''), 2500)
      router.refresh()
    })
  }

  async function chooseCharity(charityId: string) {
    setError('')
    setChangingCharity(true)
    const res = await setPreferredCharity({ charityId, contributionPercent })
    if (!res.ok) {
      setError(res.error)
      setChangingCharity(false)
      return
    }
    setChangingCharity(false)
    setCharityModalOpen(false)
    router.refresh()
    window.location.reload()
  }

  const nextDrawCountdown = useMemo(() => {
    if (!nextDrawDate) return null
    const diff = nextDrawDate.getTime() - Date.now()
    if (diff <= 0) return 'Soon'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
    return `${days}d ${hours}h`
  }, [nextDrawDate])

  return (
    <div className="p-5 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">Welcome back, {firstName}</h1>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="text-slate-400">Subscription</span>
              {getStatusBadge(subscriptionStatus)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard/settings">
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" /> Settings
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} disabled={loggingOut}>
              <LogOut className="w-4 h-4" />
              {loggingOut ? 'Signing out…' : 'Logout'}
            </Button>
          </div>
        </div>
      </motion.div>

      {isAdmin && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="mb-6">
          <Card className="p-5 border border-sky-500/20 bg-sky-500/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-sky-300">Admin access enabled</div>
                <p className="text-sm text-slate-400 mt-1">Use the admin panel to manage users, scores, charities, draws, and payout workflows.</p>
              </div>
              <Link href="/admin">
                <Button variant="outline" size="sm">Open Admin Panel</Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: score entry + performance */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="overflow-hidden" glow>
              <div className="p-5 border-b border-[#1e2a3a] flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-white flex items-center gap-2">
                    <Target className="w-4.5 h-4.5 text-emerald-400" />
                    Score Entry (Rolling 5)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Duplicate dates are blocked. Oldest score is replaced on #6.</p>
                </div>
                {avg && (
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Rolling Avg</div>
                    <div className="text-xl font-black text-white flex items-center gap-2 justify-end">
                      <TrendingUp className="w-4 h-4 text-sky-400" /> {avg}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {successMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-4"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {successMsg}
                    </motion.div>
                  )}
                </AnimatePresence>

                {isSubscribed ? (
                  <form onSubmit={onSubmitScore} className="grid sm:grid-cols-2 gap-4">
                    <Input
                      label="Stableford score (1–45)"
                      type="number"
                      value={scoreInput}
                      onChange={(e) => setScoreInput(e.target.value)}
                      placeholder="e.g. 32"
                      required
                    />
                    <Input
                      label="Date played"
                      type="date"
                      value={playedAt}
                      onChange={(e) => setPlayedAt(e.target.value)}
                      required
                    />
                    <div className="sm:col-span-2 flex justify-end">
                      <Button type="submit" loading={pending}>
                        Add Score
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-5">
                    <div className="flex items-start gap-3">
                      <Lock className="w-5 h-5 text-amber-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-300">Score entry is locked</p>
                        <p className="text-xs text-slate-400 mt-1 mb-4">Activate your subscription to add scores and keep your dashboard synced.</p>
                        <SubscribeButton userId={profile?.id ?? ''} priceId={stripePriceIdMonthly} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="overflow-hidden">
              <div className="p-5 border-b border-[#1e2a3a]">
                <h2 className="font-semibold text-white">Latest 5 Scores</h2>
                <p className="text-xs text-slate-500 mt-0.5">Reverse chronological by played date</p>
              </div>

              {optimisticScores.length === 0 ? (
                <div className="p-10 text-center">
                  <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No scores yet. Add your first round above.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#1e2a3a]">
                  {optimisticScores
                    .slice()
                    .sort((a, b) => scoreDate(b).localeCompare(scoreDate(a)))
                    .map((s, i) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + i * 0.04 }}
                        className="flex items-center justify-between px-5 py-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#1e2a3a] flex items-center justify-center text-xs font-bold text-slate-300">
                            {i + 1}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {new Date(scoreDate(s)).toLocaleDateString('en-GB', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-xs text-slate-500">Stableford</div>
                          </div>
                        </div>
                        <div className="text-2xl font-black text-white">{s.score}</div>
                      </motion.div>
                    ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Right column: profile/impact/draw/winnings */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                {profile?.avatar_url && !avatarBroken ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile?.full_name || 'Profile avatar'}
                    className="w-10 h-10 rounded-2xl object-cover border border-sky-500/30"
                    onError={() => setAvatarBroken(true)}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-300 font-semibold">
                    {avatarInitial}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm text-slate-400">Profile</div>
                  <div className="font-semibold text-white truncate">{profile?.full_name || 'Digital Hero'}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-400">Status</span>
                {getStatusBadge(subscriptionStatus)}
              </div>
              {isSubscribed ? (
                <div className="mt-4">
                  <Badge variant="warning" className="bg-amber-500/15 text-amber-300 border-amber-400/25">
                    Premium Active
                  </Badge>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-[#2a3345] bg-[#090d16] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="w-4.5 h-4.5 text-amber-400" />
                    <span className="font-semibold text-white">Upgrade to Premium</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">Unlock score entry, draw participation, and premium dashboard access.</p>
                  <div className="grid grid-cols-1 gap-3">
                    <SubscribeButton
                      userId={profile?.id ?? ''}
                      priceId={stripePriceIdMonthly}
                      label="Monthly - $5"
                      variant="secondary"
                      className="w-full"
                    />
                    <SubscribeButton
                      userId={profile?.id ?? ''}
                      priceId={stripePriceIdYearly}
                      label="Yearly - Discounted"
                      variant="outline"
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Card className="overflow-hidden">
              <div className="p-5 border-b border-[#1e2a3a] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-4.5 h-4.5 text-emerald-400" />
                  <div>
                    <h2 className="font-semibold text-white">Charity & Impact</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Default contribution: {contributionPercent}%</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCharityModalOpen(true)}>
                  Change
                </Button>
              </div>

              <div className="p-5">
                {selectedCharity ? (
                  <>
                    <div className="text-sm text-slate-400">Selected charity</div>
                    <div className="text-white font-semibold mt-1">{selectedCharity.name}</div>
                    {selectedCharity.description && (
                      <p className="text-sm text-slate-400 mt-2 line-clamp-3">{selectedCharity.description}</p>
                    )}
                  </>
                ) : (
                  <p className="text-slate-400 text-sm">No charities available.</p>
                )}
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Next Draw</div>
                    <div className="text-white font-semibold">{nextDraw?.title ?? '—'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{nextDrawLabel}</div>
                  </div>
                </div>
                {nextDrawCountdown && (
                  <div className="text-right">
                    <div className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                      <Clock className="w-3.5 h-3.5" /> Countdown
                    </div>
                    <div className="text-sm font-semibold text-amber-300">{nextDrawCountdown}</div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-slate-400">Winnings Overview</div>
                  <div className="text-2xl font-black text-white">{formatGBP(winningsPence)}</div>
                </div>
              </div>
              <Button disabled={winningsPence <= 0} variant={winningsPence > 0 ? 'primary' : 'ghost'}>
                Claim Payout
              </Button>
              {winningsPence <= 0 && (
                <p className="text-xs text-slate-500 mt-2">No winnings yet — keep entering the draws.</p>
              )}
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Charity modal */}
      <AnimatePresence>
        {charityModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !changingCharity && setCharityModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="overflow-hidden">
                <div className="p-5 border-b border-[#1e2a3a] flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">Change Charity</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Pick where your impact is directed.</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCharityModalOpen(false)} disabled={changingCharity}>
                    Close
                  </Button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#1e2a3a]">
                  {charities.map((charity) => (
                    <button
                      key={charity.id}
                      disabled={changingCharity}
                      onClick={() => chooseCharity(charity.id)}
                      className="w-full text-left p-5 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">{charity.name}</div>
                          {charity.description && <div className="text-sm text-slate-400 mt-1 line-clamp-2">{charity.description}</div>}
                        </div>
                        {charity.id === profile?.preferred_charity_id && (
                          <Badge variant="success">Selected</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                  {charities.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-sm">No charities available.</div>
                  )}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

