import { NextResponse } from 'next/server'
import { syncStripeSubscription } from '@/lib/stripe-sync'

export const runtime = 'nodejs'

function resolveReturnTo(value: string | null): string {
  if (!value) return '/dashboard'
  if (!value.startsWith('/')) return '/dashboard'
  return value
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('session_id')?.trim() ?? ''
  const returnTo = resolveReturnTo(url.searchParams.get('returnTo'))

  if (!sessionId) {
    return NextResponse.redirect(new URL(returnTo, url.origin), 303)
  }

  try {
    await syncStripeSubscription({ kind: 'checkout-session', sessionId })
  } catch (error) {
    console.error('Stripe sync route error:', error)
  }

  return NextResponse.redirect(new URL(returnTo, url.origin), 303)
}