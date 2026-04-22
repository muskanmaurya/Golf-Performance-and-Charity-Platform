import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/stripe'
import { syncStripeSubscription } from '@/lib/stripe-sync'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const stripe = getStripeClient()
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 })
  }

  if (!webhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is missing.' }, { status: 500 })
  }

  const payload = await request.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    console.error('Stripe signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (!session.id) {
          throw new Error('checkout.session.completed event missing session id.')
        }

        await syncStripeSubscription({ kind: 'checkout-session', sessionId: session.id })
        break
      }
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook processing error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook handling failed.' },
      { status: 500 }
    )
  }
}
