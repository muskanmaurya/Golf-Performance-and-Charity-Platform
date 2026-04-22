'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Check,
  Coins,
  Crown,
  Heart,
  Pencil,
  Play,
  Plus,
  RefreshCcw,
  Shield,
  Target,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { ToastContainer, useToast, type ToastType } from '@/components/ui/Toast'
import {
  adminAddCharity,
  adminDeleteCharity,
  adminDeleteGolfScore,
  adminMarkPayoutCompleted,
  adminPublishDrawResult,
  adminSetDrawLogicMode,
  adminSimulateDraw,
  adminUpdateCharity,
  adminUpdateGolfScore,
  adminUpdateUserProfile,
  adminVerifyWinnerSubmission,
  type AdminSimulationResult,
} from '@/app/actions/admin'
import type { Charity, Draw, GolfScore, Profile, Subscription } from '@/lib/types'

export type AdminUserRow = Profile & {
  charity?: Charity | null
  subscription?: Subscription | null
}

export type AdminScoreRow = Omit<GolfScore, 'played_at'> & {
  played_at?: string | null
  round_date?: string | null
  user?: Pick<Profile, 'id' | 'full_name' | 'email'> | null
}

export type AdminDrawRow = Omit<Draw, 'charity'> & {
  charity?: Charity | null
  winner?: Pick<Profile, 'id' | 'full_name' | 'email'> | null
  entryCount: number
  verifiedCount: number
  payout_completed?: boolean
}

export type AdminAnalytics = {
  totalUsers: number
  totalPrizePool: number
  totalCharityContributions: number
  drawStatistics: {
    totalDraws: number
    activeDraws: number
    publishedWinners: number
    verifiedSubmissions: number
  }
}

export type AdminDashboardData = {
  users: AdminUserRow[]
  scores: AdminScoreRow[]
  charities: Charity[]
  draws: AdminDrawRow[]
  winners: AdminDrawRow[]
  analytics: AdminAnalytics
  drawLogicMode: 'random' | 'algorithm'
}

interface Props {
  data: AdminDashboardData
}

type ToastFn = (message: string, type?: ToastType) => void

function MetricCard({
  title,
  value,
  icon: Icon,
  helper,
}: {
  title: string
  value: string | number
  helper?: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{title}</p>
          <div className="mt-2 text-2xl font-black text-white">{value}</div>
          {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
        </div>
        <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-sky-400" />
        </div>
      </div>
    </Card>
  )
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl bg-[#0b1220] border border-[#1e2a3a] text-white px-4 py-2.5 text-sm outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/10"
      >
        {children}
      </select>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-sky-400" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-slate-400 mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function CharityEditor({ charity, onRefresh, notify }: { charity: Charity; onRefresh: () => void; notify: ToastFn }) {
  const [name, setName] = useState(charity.name)
  const [description, setDescription] = useState(charity.description ?? '')
  const [logoUrl, setLogoUrl] = useState(charity.logo_url ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(charity.website_url ?? '')
  const [isActive, setIsActive] = useState(charity.is_active)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(charity.name)
    setDescription(charity.description ?? '')
    setLogoUrl(charity.logo_url ?? '')
    setWebsiteUrl(charity.website_url ?? '')
    setIsActive(charity.is_active)
  }, [charity])

  async function handleSave() {
    setSaving(true)
    const result = await adminUpdateCharity({
      charityId: charity.id,
      name,
      description,
      logoUrl,
      websiteUrl,
      isActive,
    })
    setSaving(false)
    if (result.ok) {
      notify(result.message ?? 'Charity updated.', 'success')
      onRefresh()
    } else {
      notify(result.error, 'error')
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete charity ${charity.name}?`)) return
    setSaving(true)
    const result = await adminDeleteCharity(charity.id)
    setSaving(false)
    if (result.ok) {
      notify(result.message ?? 'Charity deleted.', 'success')
      onRefresh()
    } else {
      notify(result.error, 'error')
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-white">{charity.name}</div>
          <div className="text-xs text-slate-500">£{(charity.total_raised_pence / 100).toFixed(2)} raised</div>
        </div>
        <Badge variant={isActive ? 'success' : 'default'}>{isActive ? 'Active' : 'Hidden'}</Badge>
      </div>

      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <Input label="Logo URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
      <Input label="Website URL" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />

      <label className="inline-flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>

      <div className="flex items-center gap-2">
        <Button onClick={handleSave} loading={saving} size="sm">Save</Button>
        <Button onClick={handleDelete} variant="danger" size="sm">Delete</Button>
      </div>
    </Card>
  )
}

function ScoreEditor({ score, onRefresh, notify }: { score: AdminScoreRow; onRefresh: () => void; notify: ToastFn }) {
  const [scoreValue, setScoreValue] = useState(String(score.score))
  const [playedAt, setPlayedAt] = useState((score.played_at ?? '').slice(0, 10))
  const [courseName, setCourseName] = useState(score.course_name ?? '')
  const [notes, setNotes] = useState(score.notes ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setScoreValue(String(score.score))
    setPlayedAt((score.played_at ?? '').slice(0, 10))
    setCourseName(score.course_name ?? '')
    setNotes(score.notes ?? '')
  }, [score])

  async function handleSave() {
    const parsed = Number.parseInt(scoreValue, 10)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 45) {
      notify('Score must be between 1 and 45.', 'error')
      return
    }

    setSaving(true)
    const result = await adminUpdateGolfScore({
      scoreId: score.id,
      score: parsed,
      playedAt,
      courseName,
      notes,
    })
    setSaving(false)
    if (result.ok) {
      notify(result.message ?? 'Score updated.', 'success')
      onRefresh()
    } else {
      notify(result.error, 'error')
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this score?')) return
    setSaving(true)
    const result = await adminDeleteGolfScore(score.id)
    setSaving(false)
    if (result.ok) {
      notify(result.message ?? 'Score deleted.', 'success')
      onRefresh()
    } else {
      notify(result.error, 'error')
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-white">{score.user?.full_name || score.user?.email || 'Anonymous user'}</div>
          <div className="text-xs text-slate-500">Score ID: {score.id}</div>
        </div>
        <Badge variant="default">{score.score}</Badge>
      </div>

      <Input label="Score" type="number" value={scoreValue} onChange={(e) => setScoreValue(e.target.value)} />
      <Input label="Played date" type="date" value={playedAt} onChange={(e) => setPlayedAt(e.target.value)} />
      <Input label="Course" value={courseName} onChange={(e) => setCourseName(e.target.value)} />
      <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <div className="flex items-center gap-2">
        <Button onClick={handleSave} loading={saving} size="sm">Save</Button>
        <Button onClick={handleDelete} variant="danger" size="sm">Delete</Button>
      </div>
    </Card>
  )
}

function UserEditor({
  user,
  charities,
  onRefresh,
  notify,
}: {
  user: AdminUserRow
  charities: Charity[]
  onRefresh: () => void
  notify: ToastFn
}) {
  const [fullName, setFullName] = useState(user.full_name ?? '')
  const [displayName, setDisplayName] = useState(user.display_name ?? '')
  const [role, setRole] = useState<'user' | 'admin'>(user.role)
  const [subscriptionStatus, setSubscriptionStatus] = useState(user.subscription_status)
  const [preferredCharityId, setPreferredCharityId] = useState(user.preferred_charity_id ?? '')
  const [contributionPercent, setContributionPercent] = useState(String(user.contribution_percent ?? 10))
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url ?? '')
  const [planName, setPlanName] = useState(user.subscription?.plan_name ?? 'Monthly')
  const [amountPence, setAmountPence] = useState(String(user.subscription?.amount_pence ?? 500))
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState((user.subscription?.current_period_end ?? '').slice(0, 10))
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(user.subscription?.cancel_at_period_end ?? false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFullName(user.full_name ?? '')
    setDisplayName(user.display_name ?? '')
    setRole(user.role)
    setSubscriptionStatus(user.subscription_status)
    setPreferredCharityId(user.preferred_charity_id ?? '')
    setContributionPercent(String(user.contribution_percent ?? 10))
    setAvatarUrl(user.avatar_url ?? '')
    setPlanName(user.subscription?.plan_name ?? 'Monthly')
    setAmountPence(String(user.subscription?.amount_pence ?? 500))
    setCurrentPeriodEnd((user.subscription?.current_period_end ?? '').slice(0, 10))
    setCancelAtPeriodEnd(user.subscription?.cancel_at_period_end ?? false)
  }, [user])

  async function handleSave() {
    const parsedContribution = Number.parseInt(contributionPercent, 10)
    const parsedAmount = Number.parseInt(amountPence, 10)

    if (!Number.isFinite(parsedContribution) || parsedContribution < 0 || parsedContribution > 100) {
      notify('Contribution percent must be between 0 and 100.', 'error')
      return
    }

    setSaving(true)
    const result = await adminUpdateUserProfile({
      userId: user.id,
      fullName,
      displayName,
      role,
      subscriptionStatus,
      preferredCharityId: preferredCharityId || null,
      contributionPercent: parsedContribution,
      avatarUrl: avatarUrl || null,
      planName,
      amountPence: Number.isFinite(parsedAmount) ? parsedAmount : 500,
      currentPeriodEnd: currentPeriodEnd || null,
      cancelAtPeriodEnd,
    })
    setSaving(false)
    if (result.ok) {
      notify(result.message ?? 'User updated.', 'success')
      onRefresh()
    } else {
      notify(result.error, 'error')
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-white">{user.full_name || user.email}</div>
          <div className="text-xs text-slate-500">{user.email}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={role === 'admin' ? 'success' : 'default'}>{role}</Badge>
          <Badge variant={subscriptionStatus === 'active' ? 'success' : 'warning'}>{subscriptionStatus}</Badge>
        </div>
      </div>

      <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      <Input label="Avatar URL" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />

      <SelectField label="Role" value={role} onChange={(value) => setRole(value as 'user' | 'admin')}>
        <option value="user">user</option>
        <option value="admin">admin</option>
      </SelectField>

      <SelectField
        label="Subscription status"
        value={subscriptionStatus}
        onChange={(value) => setSubscriptionStatus(value as 'inactive' | 'active' | 'cancelled' | 'past_due')}
      >
        <option value="inactive">inactive</option>
        <option value="active">active</option>
        <option value="cancelled">cancelled</option>
        <option value="past_due">past_due</option>
      </SelectField>

      <SelectField
        label="Preferred charity"
        value={preferredCharityId}
        onChange={setPreferredCharityId}
      >
        <option value="">None</option>
        {charities.map((charity) => (
          <option key={charity.id} value={charity.id}>{charity.name}</option>
        ))}
      </SelectField>

      <Input label="Contribution percent" type="number" value={contributionPercent} onChange={(e) => setContributionPercent(e.target.value)} />

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Plan name" value={planName} onChange={(e) => setPlanName(e.target.value)} />
        <Input label="Amount pence" type="number" value={amountPence} onChange={(e) => setAmountPence(e.target.value)} />
      </div>

      <Input label="Current period end" type="date" value={currentPeriodEnd} onChange={(e) => setCurrentPeriodEnd(e.target.value)} />

      <label className="inline-flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={cancelAtPeriodEnd} onChange={(e) => setCancelAtPeriodEnd(e.target.checked)} />
        Cancel at period end
      </label>

      <div className="flex items-center gap-2">
        <Button onClick={handleSave} loading={saving} size="sm">Save User</Button>
      </div>
    </Card>
  )
}

function DrawCard({
  draw,
  charities,
  onRefresh,
  notify,
  mode,
}: {
  draw: AdminDrawRow
  charities: Charity[]
  onRefresh: () => void
  notify: ToastFn
  mode: 'random' | 'algorithm'
}) {
  const [simulation, setSimulation] = useState<AdminSimulationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const winner = draw.winner
  const charity = draw.charity ?? charities.find((item) => item.id === draw.charity_id)

  async function handleSimulate() {
    setLoading(true)
    const result = await adminSimulateDraw(draw.id, mode)
    setLoading(false)
    if (result.ok && result.data) {
      setSimulation(result.data)
      notify('Draw simulation completed.', 'success')
    } else {
      notify(result.ok ? 'Simulation failed.' : result.error, 'error')
    }
  }

  async function handlePublish() {
    const winnerUserId = simulation?.winnerUserId ?? draw.winner_user_id
    if (!winnerUserId) {
      notify('Run a simulation or select a winner first.', 'error')
      return
    }

    setLoading(true)
    const result = await adminPublishDrawResult({ drawId: draw.id, winnerUserId })
    setLoading(false)
    if (result.ok) {
      notify(result.message ?? 'Draw published.', 'success')
      onRefresh()
    } else {
      notify(result.error, 'error')
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-white">{draw.title}</div>
          <div className="text-xs text-slate-500">{new Date(draw.draw_date).toLocaleDateString()}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={draw.status === 'completed' ? 'success' : draw.status === 'active' ? 'warning' : 'default'}>{draw.status}</Badge>
          {draw.payout_completed ? <Badge variant="success">Payout completed</Badge> : <Badge variant="default">Payout pending</Badge>}
        </div>
      </div>

      <div className="text-sm text-slate-400">{draw.description}</div>
      <div className="text-xs text-slate-500">Charity: {charity?.name ?? 'Unassigned'}</div>
      <div className="text-xs text-slate-500">Entries: {draw.entryCount} | Verified: {draw.verifiedCount}</div>

      {winner && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-200">
          Winner: {winner.full_name || winner.email}
        </div>
      )}

      {simulation && simulation.drawId === draw.id && (
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 space-y-2">
          <div className="text-sm font-medium text-sky-300">Simulation winner</div>
          <div className="text-white">{simulation.winnerUserId ?? 'No winner'}</div>
          <div className="text-xs text-slate-400">Mode: {simulation.mode}</div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSimulate} loading={loading} size="sm" variant="outline">
          <Play className="w-4 h-4" /> Run Simulation
        </Button>
        <Button onClick={handlePublish} loading={loading} size="sm">
          Publish Result
        </Button>
      </div>
    </Card>
  )
}

function WinnerCard({ draw, onRefresh, notify }: { draw: AdminDrawRow; onRefresh: () => void; notify: ToastFn }) {
  const [saving, setSaving] = useState(false)
  const winner = draw.winner

  async function handleVerify() {
    if (!draw.winner_user_id) return
    setSaving(true)
    const result = await adminVerifyWinnerSubmission({ drawId: draw.id, userId: draw.winner_user_id })
    setSaving(false)
    if (result.ok) {
      notify(result.message ?? 'Submission verified.', 'success')
      onRefresh()
    } else {
      notify(result.error, 'error')
    }
  }

  async function handleMarkPayout() {
    setSaving(true)
    const result = await adminMarkPayoutCompleted(draw.id)
    setSaving(false)
    if (result.ok) {
      notify(result.message ?? 'Payout completed.', 'success')
      onRefresh()
    } else {
      notify(result.error, 'error')
    }
  }

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-white">{draw.title}</div>
          <div className="text-xs text-slate-500">{draw.charity?.name ?? 'No charity'}</div>
        </div>
        <Badge variant={draw.payout_completed ? 'success' : 'warning'}>
          {draw.payout_completed ? 'Paid' : 'Open'}
        </Badge>
      </div>
      <div className="text-sm text-slate-400">
        Winner: {winner?.full_name || winner?.email || 'Unpublished'}
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleVerify} loading={saving} size="sm" variant="outline">
          <Check className="w-4 h-4" /> Verify Submission
        </Button>
        <Button onClick={handleMarkPayout} loading={saving} size="sm">
          <Coins className="w-4 h-4" /> Mark Payout Completed
        </Button>
      </div>
    </Card>
  )
}

export default function AdminDashboardClient({ data }: Props) {
  const router = useRouter()
  const { toasts, addToast, removeToast } = useToast()
  const notify: ToastFn = (message, type = 'info') => addToast(message, type)
  const [drawLogicMode, setDrawLogicMode] = useState<'random' | 'algorithm'>(data.drawLogicMode)
  const [newCharity, setNewCharity] = useState({ name: '', description: '', logoUrl: '', websiteUrl: '', isActive: true })
  const [refreshKey, setRefreshKey] = useState(0)

  const users = data.users
  const scores = data.scores
  const charities = data.charities
  const draws = data.draws
  const winners = data.winners

  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? '')
  const [selectedScoreId, setSelectedScoreId] = useState(scores[0]?.id ?? '')
  const [selectedCharityId, setSelectedCharityId] = useState(charities[0]?.id ?? '')
  const [selectedDrawId, setSelectedDrawId] = useState(draws[0]?.id ?? '')

  const selectedUser = useMemo(() => users.find((user) => user.id === selectedUserId) ?? users[0] ?? null, [users, selectedUserId])
  const selectedScore = useMemo(() => scores.find((score) => score.id === selectedScoreId) ?? scores[0] ?? null, [scores, selectedScoreId])
  const selectedCharity = useMemo(() => charities.find((charity) => charity.id === selectedCharityId) ?? charities[0] ?? null, [charities, selectedCharityId])
  const selectedDraw = useMemo(() => draws.find((draw) => draw.id === selectedDrawId) ?? draws[0] ?? null, [draws, selectedDrawId])

  useEffect(() => {
    if (!users.find((user) => user.id === selectedUserId) && users[0]) setSelectedUserId(users[0].id)
    if (!scores.find((score) => score.id === selectedScoreId) && scores[0]) setSelectedScoreId(scores[0].id)
    if (!charities.find((charity) => charity.id === selectedCharityId) && charities[0]) setSelectedCharityId(charities[0].id)
    if (!draws.find((draw) => draw.id === selectedDrawId) && draws[0]) setSelectedDrawId(draws[0].id)
  }, [users, scores, charities, draws, selectedUserId, selectedScoreId, selectedCharityId, selectedDrawId])

  const refresh = () => {
    setRefreshKey((value) => value + 1)
    router.refresh()
  }

  const analytics = data.analytics

  async function handleAddCharity() {
    if (!newCharity.name.trim()) {
      notify('Charity name is required.', 'error')
      return
    }

    const result = await adminAddCharity(newCharity)
    if (result.ok) {
      notify(result.message ?? 'Charity created.', 'success')
      setNewCharity({ name: '', description: '', logoUrl: '', websiteUrl: '', isActive: true })
      refresh()
    } else {
      notify(result.error, 'error')
    }
  }

  async function handleSetDrawMode(value: 'random' | 'algorithm') {
    setDrawLogicMode(value)
    const result = await adminSetDrawLogicMode(value)
    if (result.ok) {
      notify(result.message ?? 'Draw logic updated.', 'success')
      refresh()
    } else {
      notify(result.error, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#070b12] via-[#0b1220] to-[#070b12] text-white" key={refreshKey}>
      <div className="border-b border-[#1e2a3a] bg-[#0a0f1a]/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-sky-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-slate-400 text-sm">Manage users, draws, charities, winners, and analytics.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              <Badge variant="success">Protected admin area</Badge>
              <Badge variant="default">Changes reflect in public dashboard</Badge>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total Users" value={analytics.totalUsers} helper="Registered profiles" icon={Users} />
          <MetricCard title="Prize Pool" value={`£${(analytics.totalPrizePool / 100).toFixed(2)}`} helper="Estimated from active subscriptions" icon={Coins} />
          <MetricCard title="Charity Contributions" value={`£${(analytics.totalCharityContributions / 100).toFixed(2)}`} helper="Total raised across charities" icon={Heart} />
          <MetricCard title="Draws" value={analytics.drawStatistics.totalDraws} helper={`${analytics.drawStatistics.publishedWinners} winners published`} icon={Trophy} />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <Card className="p-5 xl:col-span-2">
            <SectionHeader icon={Users} title="User Management" description="View and edit user profiles, roles, subscriptions, charity preferences, and contribution settings." />
            <div className="mt-5 space-y-5">
              <SelectField label="Select user" value={selectedUser?.id ?? ''} onChange={setSelectedUserId}>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
                ))}
              </SelectField>
              {selectedUser && <UserEditor user={selectedUser} charities={charities} onRefresh={refresh} notify={notify} />}
            </div>
          </Card>

          <Card className="p-5 space-y-4 max-h-180 overflow-y-auto">
            <SectionHeader icon={BarChart3} title="Reports & Analytics" description="Current platform health and performance snapshot." />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-[#1e2a3a] bg-[#0b1220] p-4">
                <div className="text-xs text-slate-500">Active draws</div>
                <div className="text-2xl font-black text-white mt-1">{analytics.drawStatistics.activeDraws}</div>
              </div>
              <div className="rounded-xl border border-[#1e2a3a] bg-[#0b1220] p-4">
                <div className="text-xs text-slate-500">Verified submissions</div>
                <div className="text-2xl font-black text-white mt-1">{analytics.drawStatistics.verifiedSubmissions}</div>
              </div>
              <div className="rounded-xl border border-[#1e2a3a] bg-[#0b1220] p-4">
                <div className="text-xs text-slate-500">Completed draws</div>
                <div className="text-2xl font-black text-white mt-1">{analytics.drawStatistics.publishedWinners}</div>
              </div>
              <div className="rounded-xl border border-[#1e2a3a] bg-[#0b1220] p-4">
                <div className="text-xs text-slate-500">Newest users</div>
                <div className="text-2xl font-black text-white mt-1">{Math.min(users.length, 5)}</div>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="p-5">
            <SectionHeader icon={Target} title="Golf Scores" description="Edit or delete scores for any user." />
            <div className="mt-5 space-y-5">
              <SelectField label="Select score" value={selectedScore?.id ?? ''} onChange={setSelectedScoreId}>
                {scores.map((score) => (
                  <option key={score.id} value={score.id}>{score.user?.full_name || score.user?.email || 'User'} - {score.score}</option>
                ))}
              </SelectField>
              {selectedScore && <ScoreEditor score={selectedScore} onRefresh={refresh} notify={notify} />}
            </div>
          </Card>

          <Card className="p-5 space-y-5">
            <SectionHeader icon={Crown} title="Draw Management" description="Configure draw logic, simulate outcomes, and publish winners." />
            <div className="space-y-4">
              <SelectField label="Draw logic mode" value={drawLogicMode} onChange={(value) => void handleSetDrawMode(value as 'random' | 'algorithm')}>
                <option value="random">random</option>
                <option value="algorithm">algorithm</option>
              </SelectField>
              <SelectField label="Select draw" value={selectedDraw?.id ?? ''} onChange={setSelectedDrawId}>
                {draws.map((draw) => (
                  <option key={draw.id} value={draw.id}>{draw.title}</option>
                ))}
              </SelectField>
              {selectedDraw && <DrawCard draw={selectedDraw} charities={charities} onRefresh={refresh} notify={notify} mode={drawLogicMode} />}
            </div>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="p-5 space-y-5">
            <SectionHeader icon={Heart} title="Charity Management" description="Add, edit, delete, and publish charity content and media." />
            <div className="space-y-4">
              <Input label="Name" value={newCharity.name} onChange={(e) => setNewCharity((prev) => ({ ...prev, name: e.target.value }))} />
              <Input label="Description" value={newCharity.description} onChange={(e) => setNewCharity((prev) => ({ ...prev, description: e.target.value }))} />
              <Input label="Logo URL" value={newCharity.logoUrl} onChange={(e) => setNewCharity((prev) => ({ ...prev, logoUrl: e.target.value }))} />
              <Input label="Website URL" value={newCharity.websiteUrl} onChange={(e) => setNewCharity((prev) => ({ ...prev, websiteUrl: e.target.value }))} />
              <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={newCharity.isActive} onChange={(e) => setNewCharity((prev) => ({ ...prev, isActive: e.target.checked }))} />
                Active
              </label>
              <Button onClick={handleAddCharity} size="sm"><Plus className="w-4 h-4" /> Add Charity</Button>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <SectionHeader icon={Trash2} title="Winners Management" description="Verify submissions and mark payouts as completed." />
            <div className="space-y-3 max-h-180 overflow-y-auto pr-1">
              {winners.length > 0 ? winners.map((draw) => <WinnerCard key={draw.id} draw={draw} onRefresh={refresh} notify={notify} />) : (
                <div className="text-sm text-slate-400">No winners published yet.</div>
              )}
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <Card className="p-5">
            <SectionHeader icon={Trophy} title="Charity Registry" description="Edit or delete existing charities." />
          </Card>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {charities.map((charity) => (
              <CharityEditor key={charity.id} charity={charity} onRefresh={refresh} notify={notify} />
            ))}
          </div>
        </section>
      </main>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
