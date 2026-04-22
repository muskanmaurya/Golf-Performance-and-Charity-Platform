import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripeClient } from '@/lib/stripe'

export const runtime = 'nodejs'

async function createCheckoutSession(request: Request, priceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be signed in to subscribe.', status: 401 as const }
  }

  const stripe = getStripeClient()
  const requestUrl = new URL(request.url)
  const origin = request.headers.get('origin') ?? requestUrl.origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/api/stripe/sync?session_id={CHECKOUT_SESSION_ID}&returnTo=/dashboard`,
    cancel_url: `${origin}/dashboard?checkout=cancelled`,
    metadata: {
      userId: user.id,
      selectedPriceId: priceId,
    },
    customer_email: user.email ?? undefined,
    allow_promotion_codes: true,
  })

  if (!session.url) {
    return { error: 'Stripe Checkout did not return a URL.', status: 500 as const }
  }

  return { url: session.url }
}

export async function GET(request: Request) {
  try {
    const priceId = new URL(request.url).searchParams.get('priceId')?.trim() ?? ''

    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required.' }, { status: 400 })
    }

    const result = await createCheckoutSession(request, priceId)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.redirect(result.url, { status: 303 })
  } catch (error) {
    console.error('Checkout route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const priceId = typeof body?.priceId === 'string' ? body.priceId.trim() : ''
    const bodyUserId = typeof body?.userId === 'string' ? body.userId.trim() : ''

    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (bodyUserId && user && bodyUserId !== user.id) {
      return NextResponse.json({ error: 'User mismatch.' }, { status: 403 })
    }

    const result = await createCheckoutSession(request, priceId)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ url: result.url })
  } catch (error) {
    console.error('Checkout route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session.' },
      { status: 500 }
    )
  }
}
