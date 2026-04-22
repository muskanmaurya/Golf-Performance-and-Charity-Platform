'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Play, Check, Plus, RefreshCcw, CalendarDays, Search, Sparkles } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { adminCreateDraw, adminSimulateDraw, adminPublishDrawResult, adminSetDrawLogicMode } from '@/app/actions/admin'
import type { Draw, Charity } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface DrawWithEntryCount extends Draw {
  entryCount: number
}

interface Props {
  draws: DrawWithEntryCount[]
  charities: Charity[]
  drawLogicMode: 'random' | 'algorithm'
}

export default function DrawsPageClient({ draws: initialDraws, charities, drawLogicMode: initialMode }: Props) {
  const router = useRouter()
  const [draws, setDraws] = useState(initialDraws)
  const [selectedDrawId, setSelectedDrawId] = useState(draws[0]?.id ?? '')
  const [drawLogicMode, setDrawLogicMode] = useState(initialMode)
  const [simulationResult, setSimulationResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [creatingDraw, setCreatingDraw] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [newDraw, setNewDraw] = useState({
    title: '',
    description: '',
    charityId: charities[0]?.id ?? '',
    drawDate: '',
    prizeDescription: '',
  })

  useEffect(() => {
    setDraws(initialDraws)
  }, [initialDraws])

  useEffect(() => {
    if (!selectedDrawId && draws[0]?.id) {
      setSelectedDrawId(draws[0].id)
    }
  }, [draws, selectedDrawId])

  const selectedDraw = useMemo(() => draws.find((d) => d.id === selectedDrawId) ?? null, [draws, selectedDrawId])
  const selectedCharity = charities.find((c) => c.id === selectedDraw?.charity_id)
  const filteredDraws = useMemo(
    () => draws.filter((draw) => draw.title.toLowerCase().includes(searchTerm.toLowerCase())),
    [draws, searchTerm]
  )
  const now = Date.now()
  const completedCount = draws.filter((draw) => draw.is_published || draw.status === 'completed').length
  const upcomingCount = draws.filter((draw) => new Date(draw.draw_date).getTime() > now).length
  const activeCount = draws.filter((draw) => !draw.is_published && new Date(draw.draw_date).getTime() <= now).length

  async function handleCreateDraw() {
    if (!newDraw.title.trim() || !newDraw.charityId || !newDraw.drawDate) return

    setCreatingDraw(true)
    const result = await adminCreateDraw({
      charityId: newDraw.charityId,
      title: newDraw.title,
      description: newDraw.description,
      drawDate: new Date(newDraw.drawDate).toISOString(),
      prizeDescription: newDraw.prizeDescription,
    })
    setCreatingDraw(false)

    if (result.ok) {
      router.refresh()
      setNewDraw({
        title: '',
        description: '',
        charityId: charities[0]?.id ?? '',
        drawDate: '',
        prizeDescription: '',
      })
    }
  }

  async function handleSimulate() {
    if (!selectedDraw) return
    setLoading(true)
    const result = await adminSimulateDraw(selectedDraw.id, drawLogicMode)
    setLoading(false)
    if (result.ok && result.data) {
      setSimulationResult(result.data)
    }
  }

  async function handlePublish() {
    if (!selectedDraw || !simulationResult?.winningNumbers) return
    setLoading(true)
    const result = await adminPublishDrawResult({
      drawId: selectedDraw.id,
      winnerUserId: simulationResult.winnerUserId ?? undefined,
      winningNumbers: simulationResult.winningNumbers,
    })
    setLoading(false)
    if (result.ok) {
      router.refresh()
      setSimulationResult(null)
    }
  }

  async function handleChangeMode(mode: 'random' | 'algorithm') {
    setDrawLogicMode(mode)
    const result = await adminSetDrawLogicMode(mode)
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#070b12] via-[#0b1220] to-[#070b12]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Draw Management</h1>
              <p className="text-slate-400 text-sm mt-1">Simulate outcomes and publish winners</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Card className="p-4 border border-[#1e2a3a] bg-[#0b1220]/80">
              <p className="text-xs text-slate-400">Upcoming</p>
              <p className="text-2xl font-bold text-white mt-1">{upcomingCount}</p>
            </Card>
            <Card className="p-4 border border-[#1e2a3a] bg-[#0b1220]/80">
              <p className="text-xs text-slate-400">Active</p>
              <p className="text-2xl font-bold text-white mt-1">{activeCount}</p>
            </Card>
            <Card className="p-4 border border-[#1e2a3a] bg-[#0b1220]/80">
              <p className="text-xs text-slate-400">Completed</p>
              <p className="text-2xl font-bold text-white mt-1">{completedCount}</p>
            </Card>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Draw List */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
            <Card className="p-5 max-h-[600px] overflow-y-auto">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="font-semibold text-white">Draws</h3>
                <Badge variant="default">{draws.length}</Badge>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search draws..."
                  className="w-full pl-10 pr-3 py-2 rounded-lg bg-[#080b12] border border-[#1e2a3a] text-white placeholder-slate-500 outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-2">
                {filteredDraws.length > 0 ? (
                  filteredDraws.map((draw) => (
                    <button
                      key={draw.id}
                      onClick={() => setSelectedDrawId(draw.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedDrawId === draw.id
                          ? 'bg-amber-500/20 border border-amber-500/30'
                          : 'bg-[#0b1220] border border-[#1e2a3a] hover:border-amber-500/30'
                      }`}
                    >
                      <div className="font-medium text-white text-sm">{draw.title}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(draw.draw_date).toLocaleDateString()} · £{((draw.total_prize_pool_pence ?? 0) / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Numbers: {Array.isArray(draw.winning_numbers) && draw.winning_numbers.length > 0 ? draw.winning_numbers.join(', ') : 'Not published'}
                      </div>
                      <Badge variant={draw.is_published || draw.status === 'completed' ? 'success' : 'warning'} className="mt-2">
                        {draw.is_published || draw.status === 'completed' ? 'published' : 'live'}
                      </Badge>
                    </button>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-[#1e2a3a] bg-[#0b1220] p-4 text-sm text-slate-400">
                    No draws found. Create one below.
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Draw Details & Simulation */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Schedule a Draw
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Title"
                  value={newDraw.title}
                  onChange={(e) => setNewDraw((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Monthly prize draw"
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Charity</label>
                  <select
                    value={newDraw.charityId}
                    onChange={(e) => setNewDraw((prev) => ({ ...prev, charityId: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-[#0b1220] border border-[#1e2a3a] text-white outline-none focus:border-amber-500"
                  >
                    {charities.map((charity) => (
                      <option key={charity.id} value={charity.id}>
                        {charity.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Draw date"
                  type="datetime-local"
                  value={newDraw.drawDate}
                  onChange={(e) => setNewDraw((prev) => ({ ...prev, drawDate: e.target.value }))}
                />
                <Input
                  label="Prize description"
                  value={newDraw.prizeDescription}
                  onChange={(e) => setNewDraw((prev) => ({ ...prev, prizeDescription: e.target.value }))}
                  placeholder="Golf trip, voucher, gear pack"
                />
              </div>
              <div className="mt-4">
                <Input
                  label="Description"
                  value={newDraw.description}
                  onChange={(e) => setNewDraw((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="What this draw is for"
                />
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <Button onClick={handleCreateDraw} loading={creatingDraw}>
                  <Plus className="w-4 h-4" />
                  Create Draw
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setNewDraw({ title: '', description: '', charityId: charities[0]?.id ?? '', drawDate: '', prizeDescription: '' })}
                >
                  <RefreshCcw className="w-4 h-4" />
                  Reset
                </Button>
              </div>
            </Card>

            {selectedDraw ? (
              <>
                <Card className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">Draw Details</h2>
                      <p className="text-sm text-slate-400 mt-1">Review the selected draw before running simulation and publish.</p>
                    </div>
                    <Badge variant={selectedDraw.is_published || selectedDraw.status === 'completed' ? 'success' : 'warning'}>
                      {selectedDraw.is_published || selectedDraw.status === 'completed' ? 'published' : 'live'}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-slate-400">Title</label>
                      <p className="text-white font-medium">{selectedDraw.title}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Charity</label>
                      <p className="text-white font-medium">{selectedCharity?.name ?? 'Unassigned'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Draw Date</label>
                      <p className="text-white font-medium">{new Date(selectedDraw.draw_date).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Winning Numbers</label>
                      <p className="text-white font-medium">{Array.isArray(selectedDraw.winning_numbers) && selectedDraw.winning_numbers.length > 0 ? selectedDraw.winning_numbers.join(', ') : 'Not published yet'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Prize Pool</label>
                      <p className="text-white font-medium">£{((selectedDraw.total_prize_pool_pence ?? 0) / 100).toFixed(2)}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Run Simulation</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-300 block mb-2">Simulation Mode</label>
                      <div className="flex gap-2">
                        <Button
                          variant={drawLogicMode === 'random' ? 'primary' : 'secondary'}
                          onClick={() => handleChangeMode('random')}
                          size="sm"
                        >
                          Random
                        </Button>
                        <Button
                          variant={drawLogicMode === 'algorithm' ? 'primary' : 'secondary'}
                          onClick={() => handleChangeMode('algorithm')}
                          size="sm"
                        >
                          Weighted
                        </Button>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">Simulation generates 5 numbers between 1 and 45 and evaluates 3/4/5 matches from latest 5 scores.</p>
                    </div>

                    <Button onClick={handleSimulate} loading={loading} className="w-full">
                      <Play className="w-4 h-4" />
                      Run Simulation
                    </Button>

                    {simulationResult && (
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-4">
                        <div className="flex items-center gap-2 text-emerald-300 font-medium text-sm">
                          <Sparkles className="w-4 h-4" />
                          Simulation Preview
                        </div>
                        <div className="text-sm text-white">
                          <span className="text-slate-400">Winning numbers:</span> {simulationResult.winningNumbers?.join(', ')}
                        </div>
                        <div className="grid sm:grid-cols-3 gap-3 text-sm">
                          <div className="rounded-lg bg-[#0b1220] border border-[#1e2a3a] p-3">
                            <div className="text-slate-400">3-match winners</div>
                            <div className="text-white font-semibold mt-1">{simulationResult.tierCounts?.match3 ?? 0}</div>
                            <div className="text-xs text-slate-500 mt-1">£{((simulationResult.prizeByTierPence?.match3 ?? 0) / 100).toFixed(2)} pool</div>
                          </div>
                          <div className="rounded-lg bg-[#0b1220] border border-[#1e2a3a] p-3">
                            <div className="text-slate-400">4-match winners</div>
                            <div className="text-white font-semibold mt-1">{simulationResult.tierCounts?.match4 ?? 0}</div>
                            <div className="text-xs text-slate-500 mt-1">£{((simulationResult.prizeByTierPence?.match4 ?? 0) / 100).toFixed(2)} pool</div>
                          </div>
                          <div className="rounded-lg bg-[#0b1220] border border-[#1e2a3a] p-3">
                            <div className="text-slate-400">5-match winners</div>
                            <div className="text-white font-semibold mt-1">{simulationResult.tierCounts?.match5 ?? 0}</div>
                            <div className="text-xs text-slate-500 mt-1">£{((simulationResult.prizeByTierPence?.match5 ?? 0) / 100).toFixed(2)} pool</div>
                          </div>
                        </div>
                        <div className="text-sm text-white">
                          <span className="text-slate-400">Total monthly pool:</span> £{((simulationResult.totalPrizePoolPence ?? 0) / 100).toFixed(2)}
                        </div>
                        <Button onClick={handlePublish} loading={loading} className="w-full" variant="secondary">
                          <Check className="w-4 h-4" />
                          Publish Results
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-slate-400">Create or select a draw to run simulation and publish results.</p>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
