import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubscriberDashboard from '@/components/dashboard/SubscriberDashboard'
import type { Profile } from '@/lib/types'
import { syncStripeSubscription } from '@/lib/stripe-sync'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

async function resolveAvatarUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  avatarValue: string | null | undefined
): Promise<string> {
  if (!avatarValue) return ''

  let filePath = avatarValue
  const marker = '/avatars/'
  const markerIndex = avatarValue.indexOf(marker)
  if (markerIndex >= 0) {
    filePath = avatarValue.slice(markerIndex + marker.length).split('?')[0]
  }

  if (!filePath.includes('/')) {
    return avatarValue
  }

  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(filePath, 60 * 60)
  if (error || !data?.signedUrl) {
    return avatarValue
  }

  return data.signedUrl
}

async function fetchProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<Profile | null> {
  try {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Fetch profile error:', error);
      return null;
    }

    if (profileData) {
      return {
        ...profileData,
        contribution_percent: profileData.contribution_percent ?? 10,
      }
    }
  } catch (err) {
    console.error('Fetch profile exception:', err);
  }

  return null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const stripePriceIdMonthly =
    process.env.STRIPE_PRICE_ID_MONTHLY ??
    process.env.STRIPE_PRICE_ID ??
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ??
    ''
  const stripePriceIdYearly = process.env.STRIPE_PRICE_ID_YEARLY ?? ''
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let [profile, scoresResult, charitiesResult, nextDrawResult, winningsResult] = await Promise.all([
    fetchProfile(supabase, user.id),
    supabase
      .from('golf_scores')
      .select('*')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false, nullsFirst: false })
      .limit(5),
    supabase
      .from('charities')
      .select('*'),
    supabase
      .from('draws')
      .select('*, charity:charities(name, description)')
      .in('status', ['upcoming', 'active'])
      .order('draw_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    // Prize amounts aren't stored in schema, so winnings are represented as £0 until a payout ledger exists.
    supabase.from('draws').select('id').eq('winner_user_id', user.id),
  ])

  if (profile?.subscription_status !== 'active') {
    try {
      await syncStripeSubscription({
        kind: 'user-lookup',
        userId: user.id,
        email: user.email,
        stripeCustomerId: profile?.stripe_customer_id ?? null,
      })

      profile = await fetchProfile(supabase, user.id)
    } catch (error) {
      console.log('Dashboard subscription sync failed:', error)
    }
  }

  console.log('Charities data:', charitiesResult.data)

  const authFullName =
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    ''

  const resolvedProfile = profile
    ? {
        ...profile,
        full_name: profile.full_name || authFullName,
        email: profile.email || user.email || '',
        avatar_url: await resolveAvatarUrl(supabase, profile.avatar_url),
      }
    : null

  return (
    <SubscriberDashboard
      profile={resolvedProfile}
      scores={scoresResult.data ?? []}
      charities={charitiesResult.data ?? []}
      nextDraw={nextDrawResult.data ?? null}
      winningsPence={0}
      stripePriceIdMonthly={stripePriceIdMonthly}
      stripePriceIdYearly={stripePriceIdYearly}
    />
  )
}
