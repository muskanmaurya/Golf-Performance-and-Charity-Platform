import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { Users, Trophy, Heart, BarChart3, Crown, ShieldCheck } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { Charity, Draw, Profile, Subscription } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatMoney(pence: number) {
  return `£${(pence / 100).toFixed(2)}`
}

function getMoneyPenceAmount(values: number[], fallback = 500) {
  const validValues = values.filter((value) => Number.isFinite(value) && value > 0)
  if (validValues.length === 0) return fallback

  const total = validValues.reduce((sum, value) => sum + value, 0)
  return Math.round(total / validValues.length)
}

export default async function AnalyticsPage() {
  const admin = getSupabaseAdminClient()
  const db = admin as any

  const [profilesRes, subscriptionsRes, charitiesRes, drawsRes, entriesRes] = await Promise.all([
    db.from('profiles').select('*'),
    db.from('subscriptions').select('*'),
    db.from('charities').select('*'),
    db.from('draws').select('*'),
    db.from('draw_entries').select('*'),
  ])

  const profiles = (profilesRes.data ?? []) as Profile[]
  const subscriptions = (subscriptionsRes.data ?? []) as Subscription[]
  const charities = (charitiesRes.data ?? []) as Charity[]
  const draws = (drawsRes.data ?? []) as Draw[]
  const golfScores = (await db.from('golf_scores').select('user_id')).data ?? []

  const activeProfiles = profiles.filter((profile) => profile.subscription_status === 'active')
  const activeProfileIds = new Set(activeProfiles.map((profile) => profile.id))
  const activeSubscriptions = subscriptions.filter((subscription) => activeProfileIds.has(subscription.user_id))
  const activeSubscriptionFees = activeSubscriptions.map((subscription) => subscription.amount_pence || 0)
  const membershipFeePence = getMoneyPenceAmount(activeSubscriptionFees)
  const prizePortionPence = Math.round(membershipFeePence * 0.4)

  const totalPrizePool = activeProfiles.length * prizePortionPence

  const charityContributionById = new Map<string, number>()

  for (const profile of activeProfiles) {
    const contributionPercent = profile.contribution_percent ?? 10
    const contributionPence = Math.round(membershipFeePence * (contributionPercent / 100))
    const selectedCharityId = profile.preferred_charity_id ?? ''

    charityContributionById.set(
      selectedCharityId,
      (charityContributionById.get(selectedCharityId) ?? 0) + contributionPence
    )
  }

  const charityTotals = Array.from(charityContributionById.values()).reduce((sum, value) => sum + value, 0)

  const now = new Date()
  const completedDraws = draws.filter((draw) => draw.status === 'completed')
  const activeDraws = draws.filter((draw) => draw.status !== 'completed' && new Date(draw.draw_date) <= now)
  const upcomingDraws = draws.filter((draw) => draw.status !== 'completed' && new Date(draw.draw_date) > now)
  const payoutCompleted = draws.filter((draw) => draw.payout_completed).length

  const scoreCountByUser = golfScores.reduce((map: Map<string, number>, score: { user_id: string }) => {
    map.set(score.user_id, (map.get(score.user_id) ?? 0) + 1)
    return map
  }, new Map<string, number>())

  const scoreCounts = Array.from(scoreCountByUser.values()) as number[]
  const totalEntries = scoreCounts.filter((count) => count >= 5).length
  const charityRows = charities
    .map((charity) => {
      const total = activeProfiles
        .filter((profile) => profile.preferred_charity_id === charity.id)
        .reduce((sum, profile) => {
          const contributionPercent = profile.contribution_percent ?? 10
          return sum + Math.round(membershipFeePence * (contributionPercent / 100))
        }, 0)

      return {
        ...charity,
        total,
      }
    })
    .sort((a, b) => b.total - a.total)

  const metrics = [
    { label: 'Total users', value: profiles.length, icon: Users, tone: 'sky' as const, detail: `${activeProfiles.length} active · ${profiles.filter((profile) => profile.role === 'admin').length} admins` },
    { label: 'Total prize pool', value: formatMoney(totalPrizePool), icon: Trophy, tone: 'amber' as const, detail: `${activeProfiles.length} active subscriptions at ${formatMoney(membershipFeePence)}` },
    { label: 'Charity contribution totals', value: formatMoney(charityTotals), icon: Heart, tone: 'rose' as const, detail: `10% minimum from ${activeProfiles.length} active subscriptions` },
    { label: 'Draw statistics', value: `${completedDraws.length} published`, icon: Crown, tone: 'violet' as const, detail: `${activeDraws.length} active · ${upcomingDraws.length} upcoming` },
  ]

  return (
    <div className="min-h-screen bg-linear-to-br from-[#070b12] via-[#0b1220] to-[#070b12]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
              <p className="text-slate-400 text-sm mt-1">Track users, prize pool, charity totals, and draw performance</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">{profiles.length} users</Badge>
            <Badge variant="warning">{activeProfiles.length} active subscriptions</Badge>
            <Badge variant="default">{completedDraws.length} published draws</Badge>
            <Badge variant={totalEntries > 0 ? 'success' : 'default'}>{totalEntries} eligible users</Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <Card key={metric.label} className="p-5 border border-[#1e2a3a] bg-[#0b1220]/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">{metric.label}</p>
                    <h2 className="text-2xl font-bold text-white mt-2">{metric.value}</h2>
                    <p className="text-xs text-slate-500 mt-2">{metric.detail}</p>
                  </div>
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                    metric.tone === 'sky'
                      ? 'bg-sky-500/15 text-sky-400'
                      : metric.tone === 'amber'
                      ? 'bg-amber-500/15 text-amber-400'
                      : metric.tone === 'rose'
                      ? 'bg-rose-500/15 text-rose-400'
                      : 'bg-violet-500/15 text-violet-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6 border border-[#1e2a3a] bg-[#0b1220]/80">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Draw overview</h2>
              <ShieldCheck className="w-5 h-5 text-sky-400" />
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-slate-300"><span>Published draws</span><span className="text-white font-semibold">{completedDraws.length}</span></div>
              <div className="flex items-center justify-between text-slate-300"><span>Active draws</span><span className="text-white font-semibold">{activeDraws.length}</span></div>
              <div className="flex items-center justify-between text-slate-300"><span>Upcoming draws</span><span className="text-white font-semibold">{upcomingDraws.length}</span></div>
              <div className="flex items-center justify-between text-slate-300"><span>Payouts completed</span><span className="text-white font-semibold">{payoutCompleted}</span></div>
              <div className="flex items-center justify-between text-slate-300"><span>Eligible users</span><span className="text-white font-semibold">{totalEntries}</span></div>
            </div>
          </Card>

          <Card className="p-6 border border-[#1e2a3a] bg-[#0b1220]/80">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Charity performance</h2>
              <Heart className="w-5 h-5 text-rose-400" />
            </div>
            <div className="space-y-3">
              {charityRows.map((charity) => (
                <div key={charity.id} className="rounded-xl border border-[#1e2a3a] bg-[#0a0f1a] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-white font-medium">{charity.name}</p>
                      <p className="text-xs text-slate-500">{charity.is_active ? 'Active' : 'Hidden'}</p>
                    </div>
                    <p className="text-white font-semibold">{formatMoney(charity.total)}</p>
                  </div>
                </div>
              ))}
              {charities.length === 0 && <p className="text-slate-400 text-sm">No charity records yet.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}