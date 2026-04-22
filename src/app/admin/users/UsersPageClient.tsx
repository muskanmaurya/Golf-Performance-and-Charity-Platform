'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Search, Trash2, Save, RefreshCcw, CreditCard, X, Edit2, Check, ExternalLink } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { adminUpdateUserProfile, adminDeleteGolfScore, adminUpdateGolfScore } from '@/app/actions/admin'
import type { Charity, Profile, Subscription } from '@/lib/types'

interface UserWithData extends Profile {
  subscription: Subscription | null
  scores: any[]
  scoreCount: number
  winnerProofs: Array<{
    drawId: string
    drawTitle: string
    winnerAnnouncedAt: string | null
    verified: boolean
    proofUrl: string | null
  }>
}

interface Props {
  users: UserWithData[]
  charities: Charity[]
  allScores: any[]
}

export default function UsersPageClient({ users: initialUsers, charities, allScores }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? '')
  const [updatingUser, setUpdatingUser] = useState(false)
  const [deletingScore, setDeletingScore] = useState(false)
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null)
  const [scoreDraft, setScoreDraft] = useState('')
  const [savingScore, setSavingScore] = useState(false)
  const [draft, setDraft] = useState({
    full_name: '',
    display_name: '',
    role: 'user' as 'user' | 'admin',
    subscription_status: 'inactive' as 'inactive' | 'active' | 'cancelled' | 'past_due',
    preferred_charity_id: '',
    contribution_percent: '10',
  })

  const selectedUser = useMemo(() => users.find((u) => u.id === selectedUserId) ?? users[0] ?? null, [users, selectedUserId])
  const userScores = useMemo(() => selectedUser?.scores ?? [], [selectedUser])
  const profileUsers = users.filter((user) => user.role === 'user').length
  const adminUsers = users.filter((user) => user.role === 'admin').length
  const totalScores = allScores.length
  const charityMap = useMemo(() => new Map(charities.map((charity) => [charity.id, charity.name])), [charities])
  const filteredUsers = useMemo(
    () => {
      const normalizedTerm = searchTerm.trim().toLowerCase()
      if (!normalizedTerm) return users

      return users.filter((u) => {
        const fullName = (u.full_name ?? '').toLowerCase()
        const email = ((u as any).email ?? '').toLowerCase()
        return fullName.includes(normalizedTerm) || email.includes(normalizedTerm)
      })
    },
    [users, searchTerm]
  )

  useEffect(() => {
    if (!selectedUser) return

    setDraft({
      full_name: selectedUser.full_name ?? '',
      display_name: selectedUser.display_name ?? '',
      role: selectedUser.role,
      subscription_status: selectedUser.subscription_status,
      preferred_charity_id: selectedUser.preferred_charity_id ?? '',
      contribution_percent: String(selectedUser.contribution_percent ?? 10),
    })
  }, [selectedUserId, selectedUser])

  async function handleUpdateUser() {
    if (!selectedUser) return

    setUpdatingUser(true)
    const result = await adminUpdateUserProfile({
      userId: selectedUser.id,
      fullName: draft.full_name,
      displayName: draft.display_name || null,
      role: draft.role,
      subscriptionStatus: draft.subscription_status,
      preferredCharityId: draft.preferred_charity_id || null,
      contributionPercent: Number.isFinite(Number(draft.contribution_percent)) ? Number(draft.contribution_percent) : 10,
    })
    setUpdatingUser(false)
    if (result.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                full_name: draft.full_name,
                display_name: draft.display_name || null,
                role: draft.role,
                subscription_status: draft.subscription_status,
                preferred_charity_id: draft.preferred_charity_id || null,
                contribution_percent: Number(draft.contribution_percent),
              }
            : u
        )
      )
    }
  }

  async function handleDeleteScore(scoreId: string) {
    if (!confirm('Delete this score? This cannot be undone.')) return
    setDeletingScore(true)
    const result = await adminDeleteGolfScore(scoreId)
    setDeletingScore(false)
    if (result.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, scores: u.scores.filter((s) => s.id !== scoreId), scoreCount: u.scoreCount - 1 }
            : u
        )
      )
    }
  }

  async function handleSaveScore(score: any) {
    if (!selectedUser || !editingScoreId) return

    const parsedScore = Number(scoreDraft)
    if (!Number.isFinite(parsedScore)) return

    setSavingScore(true)
    const result = await adminUpdateGolfScore({
      scoreId: score.id,
      score: parsedScore,
      playedAt: score.played_at,
      courseName: score.course_name,
      notes: score.notes,
    })
    setSavingScore(false)

    if (result.ok) {
      setUsers((prev) =>
        prev.map((user) => {
          if (user.id !== selectedUser.id) return user
          return {
            ...user,
            scores: user.scores.map((existingScore) =>
              existingScore.id === score.id
                ? {
                    ...existingScore,
                    score: parsedScore,
                  }
                : existingScore
            ),
          }
        })
      )
      setEditingScoreId(null)
      setScoreDraft('')
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#070b12] via-[#0b1220] to-[#070b12]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-sky-500 to-emerald-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">User Management</h1>
              <p className="text-slate-400 text-sm mt-1">View and edit user profiles, roles, subscriptions, and scores</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Card className="p-4 border border-[#1e2a3a] bg-[#0b1220]/80">
              <p className="text-xs text-slate-400">Users</p>
              <p className="text-2xl font-bold text-white mt-1">{profileUsers}</p>
            </Card>
            <Card className="p-4 border border-[#1e2a3a] bg-[#0b1220]/80">
              <p className="text-xs text-slate-400">Admins</p>
              <p className="text-2xl font-bold text-white mt-1">{adminUsers}</p>
            </Card>
            <Card className="p-4 border border-[#1e2a3a] bg-[#0b1220]/80">
              <p className="text-xs text-slate-400">Golf scores</p>
              <p className="text-2xl font-bold text-white mt-1">{totalScores}</p>
            </Card>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* User List */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
            <Card className="p-5 max-h-[600px] overflow-y-auto">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#080b12] border border-[#1e2a3a] text-white placeholder-slate-500 outline-none focus:border-sky-500"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedUserId === user.id
                          ? 'bg-sky-500/20 border border-sky-500/30'
                          : 'bg-[#0b1220] border border-[#1e2a3a] hover:border-sky-500/30'
                      }`}
                    >
                      <div className="font-medium text-white text-sm">{user.full_name || (user as any).email || 'Unnamed user'}</div>
                      <div className="text-xs text-slate-400 mt-1">{(user as any).email || 'No email on profile'}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Charity: {charityMap.get(user.preferred_charity_id ?? '') ?? 'None'}
                      </div>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Badge variant={user.role === 'admin' ? 'success' : 'default'}>{user.role}</Badge>
                        <Badge
                          variant={
                            user.subscription_status === 'active'
                              ? 'success'
                              : user.subscription_status === 'inactive'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {user.subscription_status}
                        </Badge>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-[#1e2a3a] bg-[#0b1220] p-4 text-sm text-slate-400">
                    No users match this search. Clear the filter to show the full list.
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* User Details */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-6">
            {selectedUser && (
              <>
                {/* Profile Edit */}
                <Card className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">Profile</h2>
                      <p className="text-sm text-slate-400 mt-1">Edit the user, then save once with the button below.</p>
                    </div>
                    <Badge variant={selectedUser.role === 'admin' ? 'success' : 'default'}>{selectedUser.role}</Badge>
                  </div>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        label="Full Name"
                        value={draft.full_name}
                        onChange={(e) => setDraft((prev) => ({ ...prev, full_name: e.target.value }))}
                      />
                      <Input
                        label="Display Name"
                        value={draft.display_name}
                        onChange={(e) => setDraft((prev) => ({ ...prev, display_name: e.target.value }))}
                      />
                    </div>

                    <Input label="Email" value={(selectedUser as any).email ?? ''} disabled />

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-300">Role</label>
                        <select
                          value={draft.role}
                          onChange={(e) => setDraft((prev) => ({ ...prev, role: e.target.value as 'user' | 'admin' }))}
                          className="w-full px-4 py-2 rounded-lg bg-[#0b1220] border border-[#1e2a3a] text-white outline-none focus:border-sky-500"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-300">Subscription</label>
                        <select
                          value={draft.subscription_status}
                          onChange={(e) => setDraft((prev) => ({ ...prev, subscription_status: e.target.value as any }))}
                          className="w-full px-4 py-2 rounded-lg bg-[#0b1220] border border-[#1e2a3a] text-white outline-none focus:border-sky-500"
                        >
                          <option value="inactive">Inactive</option>
                          <option value="active">Active</option>
                          <option value="past_due">Past Due</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-300">Preferred Charity</label>
                        <select
                          value={draft.preferred_charity_id}
                          onChange={(e) => setDraft((prev) => ({ ...prev, preferred_charity_id: e.target.value }))}
                          className="w-full px-4 py-2 rounded-lg bg-[#0b1220] border border-[#1e2a3a] text-white outline-none focus:border-sky-500"
                        >
                          <option value="">None</option>
                          {charities.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <Input
                        label="Contribution %"
                        type="number"
                        value={draft.contribution_percent}
                        onChange={(e) => setDraft((prev) => ({ ...prev, contribution_percent: e.target.value }))}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button onClick={handleUpdateUser} loading={updatingUser}>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setDraft({
                            full_name: selectedUser.full_name ?? '',
                            display_name: selectedUser.display_name ?? '',
                            role: selectedUser.role,
                            subscription_status: selectedUser.subscription_status,
                            preferred_charity_id: selectedUser.preferred_charity_id ?? '',
                            contribution_percent: String(selectedUser.contribution_percent ?? 10),
                          })
                        }
                      >
                        <RefreshCcw className="w-4 h-4" />
                        Reset
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Scores */}
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Golf Scores ({userScores.length})</h2>
                  {userScores.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {userScores.map((score) => (
                        <div
                          key={score.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-[#0b1220] border border-[#1e2a3a]"
                        >
                          <div>
                            {editingScoreId === score.id ? (
                              <input
                                type="number"
                                value={scoreDraft}
                                onChange={(e) => setScoreDraft(e.target.value)}
                                className="w-24 px-2 py-1 rounded-lg bg-[#080b12] border border-[#1e2a3a] text-white"
                              />
                            ) : (
                              <div className="font-semibold text-white">{score.score}</div>
                            )}
                            <div className="text-xs text-slate-400">
                              {score.played_at ? new Date(score.played_at).toLocaleDateString() : 'No date'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {editingScoreId === score.id ? (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  loading={savingScore}
                                  onClick={() => handleSaveScore(score)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingScoreId(null)
                                    setScoreDraft('')
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingScoreId(score.id)
                                  setScoreDraft(String(score.score ?? ''))
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="danger"
                              size="sm"
                              loading={deletingScore}
                              onClick={() => handleDeleteScore(score.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400">No scores yet</p>
                  )}
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Winner Proof</h2>
                  {selectedUser.winnerProofs.length > 0 ? (
                    <div className="space-y-3">
                      {selectedUser.winnerProofs.map((proof) => (
                        <div key={proof.drawId} className="rounded-lg border border-[#1e2a3a] bg-[#0b1220] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-white font-medium">{proof.drawTitle}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                Announced: {proof.winnerAnnouncedAt ? new Date(proof.winnerAnnouncedAt).toLocaleString() : 'N/A'}
                              </p>
                            </div>
                            <Badge variant={proof.verified ? 'success' : 'warning'}>
                              {proof.verified ? 'Verified' : 'Pending Verification'}
                            </Badge>
                          </div>
                          <div className="mt-3">
                            {proof.proofUrl ? (
                              <a
                                href={proof.proofUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 text-sm"
                              >
                                <ExternalLink className="w-4 h-4" />
                                View uploaded proof
                              </a>
                            ) : (
                              <p className="text-sm text-slate-400">No proof URL submitted yet for this winner.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400">No winner record found for this user yet.</p>
                  )}
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Subscription Snapshot
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="rounded-lg border border-[#1e2a3a] bg-[#0b1220] p-4">
                      <p className="text-slate-400">Status</p>
                      <p className="text-white font-medium mt-1">{selectedUser.subscription_status}</p>
                    </div>
                    <div className="rounded-lg border border-[#1e2a3a] bg-[#0b1220] p-4">
                      <p className="text-slate-400">Role</p>
                      <p className="text-white font-medium mt-1">{selectedUser.role}</p>
                    </div>
                    <div className="rounded-lg border border-[#1e2a3a] bg-[#0b1220] p-4">
                      <p className="text-slate-400">Preferred charity</p>
                      <p className="text-white font-medium mt-1">{charities.find((c) => c.id === selectedUser.preferred_charity_id)?.name ?? 'None'}</p>
                    </div>
                    <div className="rounded-lg border border-[#1e2a3a] bg-[#0b1220] p-4">
                      <p className="text-slate-400">Contribution %</p>
                      <p className="text-white font-medium mt-1">{selectedUser.contribution_percent ?? 10}%</p>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
