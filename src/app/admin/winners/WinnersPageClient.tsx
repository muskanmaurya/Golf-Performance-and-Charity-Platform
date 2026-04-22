'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, Check, Coins, ShieldCheck, ListChecks } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { adminVerifyWinnerSubmission, adminMarkPayoutCompleted } from '@/app/actions/admin'
import type { Draw, Profile, Charity } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface WinnerDraw extends Draw {
  winner: Profile | null
  charity: Charity | undefined
  entryCount: number
}

interface Props {
  winners: WinnerDraw[]
}

export default function WinnersPageClient({ winners: initialWinners }: Props) {
  const router = useRouter()
  const [winners, setWinners] = useState(initialWinners)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const verifiedCount = useMemo(() => winners.filter((winner) => winner.winner_user_id).length, [winners])
  const paidCount = useMemo(() => winners.filter((winner) => (winner as any).payout_completed).length, [winners])

  async function handleVerifySubmission(drawId: string, userId: string) {
    setLoading(true)
    const result = await adminVerifyWinnerSubmission({ drawId, userId })
    setLoading(false)
    if (result.ok) {
      router.refresh()
    }
  }

  async function handleMarkPayout(drawId: string) {
    if (!confirm('Mark this payout as completed?')) return
    setLoading(true)
    const result = await adminMarkPayoutCompleted(drawId)
    setLoading(false)
    if (result.ok) {
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#070b12] via-[#0b1220] to-[#070b12]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Winners Management</h1>
              <p className="text-slate-400 text-sm mt-1">Verify submissions and process payouts</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Card className="p-4 border border-[#1e2a3a] bg-[#0b1220]/80">
              <p className="text-xs text-slate-400">Published winners</p>
              <p className="text-2xl font-bold text-white mt-1">{winners.length}</p>
            </Card>
            <Card className="p-4 border border-[#1e2a3a] bg-[#0b1220]/80">
              <p className="text-xs text-slate-400">Verified submissions</p>
              <p className="text-2xl font-bold text-white mt-1">{verifiedCount}</p>
            </Card>
            <Card className="p-4 border border-[#1e2a3a] bg-[#0b1220]/80">
              <p className="text-xs text-slate-400">Payouts completed</p>
              <p className="text-2xl font-bold text-white mt-1">{paidCount}</p>
            </Card>
          </div>
        </motion.div>

        {winners.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-slate-400">No winners published yet</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {winners.map((winner) => (
              <motion.div
                key={winner.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: winners.indexOf(winner) * 0.05 }}
              >
                <Card className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{winner.title}</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        {winner.charity?.name || 'Unknown Charity'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={winner.status === 'completed' ? 'success' : 'warning'}>
                        {winner.status}
                      </Badge>
                      <Badge
                        variant={
                          (winner as any).payout_completed
                            ? 'success'
                            : 'warning'
                        }
                      >
                        {(winner as any).payout_completed ? 'Paid' : 'Pending'}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-slate-400">Winner</label>
                      <p className="text-white font-medium">{winner.winner?.full_name || winner.winner?.email}</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Draw Date</label>
                      <p className="text-white font-medium">
                        {new Date(winner.draw_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Entries</label>
                      <p className="text-white font-medium">{winner.entryCount} participants</p>
                    </div>
                  </div>

                  {winner.description && (
                    <div className="mb-4">
                      <label className="text-xs text-slate-400">Description</label>
                      <p className="text-sm text-slate-300">{winner.description}</p>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap items-center">
                    <Button
                      onClick={() =>
                        handleVerifySubmission(winner.id, winner.winner_user_id!)
                      }
                      loading={loading}
                      size="sm"
                      variant="outline"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Verify Submission
                    </Button>
                    <Button
                      onClick={() => handleMarkPayout(winner.id)}
                      loading={loading}
                      size="sm"
                    >
                      <Coins className="w-4 h-4" />
                      Mark Payout Completed
                    </Button>
                    <Badge variant="default" className="h-9 px-3 flex items-center gap-1">
                      <ListChecks className="w-3.5 h-3.5" />
                      Full record
                    </Badge>
                  </div>

                  {expandedId === winner.id && (
                    <div className="mt-4 p-4 rounded-lg bg-[#0b1220] border border-[#1e2a3a]">
                      <h4 className="font-medium text-white mb-3">Winner Details</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-slate-400">Email:</span>
                          <span className="ml-2 text-white">{winner.winner?.email}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">User ID:</span>
                          <span className="ml-2 text-white text-xs">{winner.winner_user_id}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Announced:</span>
                          <span className="ml-2 text-white">
                            {winner.winner_announced_at
                              ? new Date(winner.winner_announced_at).toLocaleString()
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedId(expandedId === winner.id ? null : winner.id)
                    }
                    className="mt-3"
                  >
                    {expandedId === winner.id ? 'Hide Details' : 'Show Details'}
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
