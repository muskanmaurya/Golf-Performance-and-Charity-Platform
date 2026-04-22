import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LotteryPage from '@/components/dashboard/LotteryPage'
import type { Draw } from '@/lib/types'

function buildDemoDraws(): Draw[] {
  const now = new Date()
  const base = now.toISOString()

  const inDays = (days: number) => {
    const date = new Date(now)
    date.setDate(date.getDate() + days)
    return date.toISOString()
  }

  return [
    {
      id: 'demo-draw-active',
      charity_id: 'demo-charity',
      title: 'Spring Championship Demo Draw',
      description: 'Demo draw shown when no live draws have been created yet.',
      draw_date: inDays(10),
      prize_description: 'Premium Driver Fitting Session',
      status: 'active',
      winner_user_id: null,
      winner_announced_at: null,
      created_by: null,
      created_at: base,
      updated_at: base,
      charity: undefined,
      user_entered: false,
    },
    {
      id: 'demo-draw-upcoming-1',
      charity_id: 'demo-charity',
      title: 'Summer Major Demo Draw',
      description: 'Upcoming demo draw preview.',
      draw_date: inDays(35),
      prize_description: '4-Ball Weekend Experience',
      status: 'upcoming',
      winner_user_id: null,
      winner_announced_at: null,
      created_by: null,
      created_at: base,
      updated_at: base,
      charity: undefined,
      user_entered: false,
    },
    {
      id: 'demo-draw-upcoming-2',
      charity_id: 'demo-charity',
      title: 'Autumn Charity Demo Draw',
      description: 'Upcoming demo draw preview.',
      draw_date: inDays(63),
      prize_description: 'Custom Club Gapping Session',
      status: 'upcoming',
      winner_user_id: null,
      winner_announced_at: null,
      created_by: null,
      created_at: base,
      updated_at: base,
      charity: undefined,
      user_entered: false,
    },
  ]
}

export default async function DrawsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, drawsRes, entriesRes] = await Promise.all([
    supabase.from('profiles').select('subscription_status').eq('id', user.id).maybeSingle(),
    supabase
      .from('draws')
      .select('*, charity:charities(name, description)')
      .neq('status', 'cancelled')
      .order('draw_date', { ascending: true }),
    supabase.from('draw_entries').select('draw_id').eq('user_id', user.id),
  ])

  const enteredDrawIds = new Set((entriesRes.data ?? []).map(e => e.draw_id))

  const draws = (drawsRes.data ?? []).map(d => ({
    ...d,
    user_entered: enteredDrawIds.has(d.id),
  }))

  const subscriptionStatus = profileRes.data?.subscription_status ?? 'inactive'
  const hasLiveOrUpcomingDraw = draws.some((draw) => draw.status === 'active' || draw.status === 'upcoming')
  const visibleDraws = subscriptionStatus === 'active' && !hasLiveOrUpcomingDraw
    ? buildDemoDraws()
    : draws

  return (
    <LotteryPage
      draws={visibleDraws}
      subscriptionStatus={subscriptionStatus}
      userId={user.id}
    />
  )
}
