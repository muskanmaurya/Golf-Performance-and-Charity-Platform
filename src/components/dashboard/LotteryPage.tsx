'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Calendar, Gift, CircleCheck as CheckCircle2, Lock, Users, Sparkles, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import type { Draw } from '@/lib/types'

interface Props {
  draws: Draw[]
  subscriptionStatus: string
  userId: string
}

interface CountdownTime {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export default function LotteryPage({ draws: initialDraws, subscriptionStatus, userId }: Props) {
  const [draws, setDraws] = useState(initialDraws)
  const [entering, setEntering] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<CountdownTime>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const isSubscribed = subscriptionStatus === 'active'
  const isDemoDraw = (drawId: string) => drawId.startsWith('demo-draw-')

  const featuredDraw = draws.find(d => d.status === 'active') || draws.find(d => d.status === 'upcoming')
  const pastDraws = draws.filter(d => d.status === 'completed').slice(0, 5)
  const upcomingDraws = draws.filter(d => d.status === 'upcoming' && d.id !== featuredDraw?.id)

  // Countdown timer
  useEffect(() => {
    if (!featuredDraw) return

    const calculateCountdown = () => {
      const now = new Date().getTime()
      const drawTime = new Date(featuredDraw.draw_date).getTime()
      const difference = drawTime - now

      if (difference > 0) {
        setCountdown({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        })
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      }
    }

    calculateCountdown()
    const interval = setInterval(calculateCountdown, 1000)
    return () => clearInterval(interval)
  }, [featuredDraw])

  async function handleEnter(drawId: string) {
    if (!isSubscribed || isDemoDraw(drawId)) return
    setEntering(drawId)
    const supabase = createClient()
    const { error } = await supabase
      .from('draw_entries')
      .insert({ draw_id: drawId, user_id: userId })

    if (!error) {
      setDraws(prev => prev.map(d => d.id === drawId ? { ...d, user_entered: true } : d))
    }
    setEntering(null)
  }

  const charity = featuredDraw?.charity as { name: string; description: string } | undefined

  return (
    <div className="min-h-screen bg-linear-to-br from-[#0a0f1a] via-[#0e1420] to-[#0a0f1a]">
      {/* Header */}
      <div className="border-b border-[#1e2a3a] bg-[#0a0f1a]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Prize Draws</h1>
                <p className="text-sm text-slate-400 mt-0.5">Monthly charity draws for active subscribers</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Subscription Lock */}
        {!isSubscribed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="relative rounded-3xl border border-amber-500/20 bg-amber-500/8 p-8 sm:p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Unlock Prize Draws</h2>
              <p className="text-slate-400 max-w-md mx-auto">
                Subscribe to Digital Heroes for £5/month to enter our monthly charity draws and compete for prizes while supporting great causes.
              </p>
            </div>
          </motion.div>
        )}

        {/* Featured Draw */}
        {featuredDraw && isSubscribed && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            <div className="relative rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent p-8 sm:p-12 overflow-hidden">
              {/* Decorative blur */}
              <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

              <div className="relative">
                <div className="flex items-start justify-between gap-4 mb-8">
                  <div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-4"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-300">This Month's Draw</span>
                    </motion.div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">{featuredDraw.title}</h2>
                    {isDemoDraw(featuredDraw.id) && (
                      <p className="text-xs text-amber-300 mb-2">Demo content shown until an admin publishes real draws.</p>
                    )}
                    {charity && (
                      <p className="text-sky-400 text-sm">Supporting <span className="font-medium">{charity.name}</span></p>
                    )}
                  </div>
                  {featuredDraw.user_entered && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-300">You're In!</span>
                    </motion.div>
                  )}
                </div>

                {/* Countdown */}
                <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-12">
                  {[
                    { label: 'Days', value: countdown.days },
                    { label: 'Hours', value: countdown.hours },
                    { label: 'Minutes', value: countdown.minutes },
                    { label: 'Seconds', value: countdown.seconds },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      className="rounded-2xl bg-[#080b12]/50 border border-[#1e2a3a] p-4 text-center"
                    >
                      <div className="text-2xl sm:text-3xl font-black text-white mb-1">
                        {String(item.value).padStart(2, '0')}
                      </div>
                      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{item.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Details Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="flex gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Gift className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">Prize</p>
                      <p className="text-lg font-bold text-white">{featuredDraw.prize_description || 'TBD'}</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-sky-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">Draw Date</p>
                      <p className="text-lg font-bold text-white">
                        {new Date(featuredDraw.draw_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="flex gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">Participants</p>
                      <p className="text-lg font-bold text-white">--</p>
                    </div>
                  </motion.div>
                </div>

                {/* CTA Button */}
                {!featuredDraw.user_entered && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {isDemoDraw(featuredDraw.id) ? (
                      <Button variant="secondary" size="lg" className="w-full sm:w-auto" disabled>
                        <span className="text-lg">Demo Draw</span>
                        <Sparkles className="w-5 h-5" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleEnter(featuredDraw.id)}
                        loading={entering === featuredDraw.id}
                        variant="primary"
                        size="lg"
                        className="w-full sm:w-auto"
                      >
                        <span className="text-lg">Enter Draw</span>
                        <Sparkles className="w-5 h-5" />
                      </Button>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {/* Upcoming Draws */}
        {upcomingDraws.length > 0 && isSubscribed && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Upcoming Draws</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {upcomingDraws.map((draw, i) => (
                <motion.div
                  key={draw.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                >
                  <Card className="p-6 h-full hover:border-sky-500/30 transition-colors duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                        <Target className="w-5 h-5 text-sky-400" />
                      </div>
                      <Badge variant="info">Coming Soon</Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">{draw.title}</h3>
                    {(draw.charity as { name: string } | undefined)?.name && (
                      <p className="text-xs text-sky-400 mb-3">Supporting {(draw.charity as { name: string }).name}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                      <Calendar className="w-4 h-4" />
                      {new Date(draw.draw_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                    <Button variant="secondary" size="sm" className="w-full" disabled>
                      Coming Soon
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Past Draws */}
        {pastDraws.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Previous Results</h2>
            <div className="space-y-3">
              {pastDraws.map((draw, i) => (
                <motion.div
                  key={draw.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.75 + i * 0.05 }}
                >
                  <Card className="p-5 hover:border-slate-400/20 transition-colors duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-300">{draw.title}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(draw.draw_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <Badge variant="default">Completed</Badge>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Empty State */}
        {draws.length === 0 && isSubscribed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-300 font-medium text-lg mb-1">No draws yet</p>
            <p className="text-slate-500">Check back soon — draws are added monthly</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
