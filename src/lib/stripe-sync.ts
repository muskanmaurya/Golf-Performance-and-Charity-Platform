import Stripe from 'stripe'
import { revalidatePath } from 'next/cache'
import { getStripeClient } from '@/lib/stripe'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

type SyncSource =
  | {
      kind: 'checkout-session'
      sessionId: string
    }
  | {
      kind: 'user-lookup'
      userId: string
      email?: string | null
      stripeCustomerId?: string | null
    }

type SubscriptionStatus = 'inactive' | 'active' | 'cancelled' | 'past_due'

function isSchemaCacheError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('schema cache') || lower.includes('could not find')
}

function mapStripeStatus(status: Stripe.Subscription.Status | undefined): SubscriptionStatus {
  if (status === 'active' || status === 'trialing') return 'active'
  if (status === 'past_due') return 'past_due'
  if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') return 'cancelled'
  return 'inactive'
}

function mapPlanName(price: Stripe.Price | undefined): string {
  const interval = price?.recurring?.interval
  if (interval === 'year') return 'Yearly'
  if (interval === 'month') return 'Monthly'
  return price?.nickname || 'Monthly'
}

function toDate(value: number | null | undefined): string | null {
  if (!value) return null
  return new Date(value * 1000).toISOString()
}

async function upsertSubscriptionFromStripe(
  userId: string,
  customerId: string | null,
  subscription: Stripe.Subscription,
  selectedPriceId?: string | null
) {
  const supabaseAdmin = getSupabaseAdminClient()
  const stripeSubscription = subscription as Stripe.Subscription & {
    current_period_start?: number
    current_period_end?: number
    cancel_at_period_end?: boolean
  }
  const price = subscription.items.data[0]?.price
  const subscriptionStatus = mapStripeStatus(subscription.status)

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ subscription_status: subscriptionStatus } as never)
    .eq('id', userId)

  if (profileError) {
    throw profileError
  }

  if (customerId) {
    const { error: customerIdError } = await supabaseAdmin
      .from('profiles')
      .update({
        stripe_customer_id: customerId,
      } as never)
      .eq('id', userId)

    if (customerIdError) {
      const message = customerIdError.message.toLowerCase()
      const missingStripeCustomerId = message.includes('stripe_customer_id') && isSchemaCacheError(message)

      if (!missingStripeCustomerId) {
        throw customerIdError
      }
    }
  }

  if (subscription.id) {
    const { error: subscriptionError } = await supabaseAdmin.from('subscriptions').upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: selectedPriceId ?? price?.id ?? null,
        status: subscriptionStatus,
        plan_name: mapPlanName(price),
        amount_pence: price?.unit_amount ?? 0,
        current_period_start: toDate(stripeSubscription.current_period_start),
        current_period_end: toDate(stripeSubscription.current_period_end),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end ?? false,
      } as never,
      {
        onConflict: 'stripe_subscription_id',
      }
    )

    if (subscriptionError) {
      // Older/local schemas may not have the latest subscription columns yet.
      if (!isSchemaCacheError(subscriptionError.message)) {
        throw subscriptionError
      }
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/scores')
  revalidatePath('/dashboard/draws')
  revalidatePath('/dashboard/settings')

  return subscriptionStatus
}

async function findActiveSubscriptionByCustomer(customerId: string, stripe: Stripe) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
    expand: ['data.items.data.price'],
  })

  return subscriptions.data.find(
    (subscription) => subscription.status === 'active' || subscription.status === 'trialing' || subscription.status === 'past_due'
  ) ?? null
}

export async function syncStripeSubscription(source: SyncSource) {
  const stripe = getStripeClient()

  if (source.kind === 'checkout-session') {
    const session = await stripe.checkout.sessions.retrieve(source.sessionId, {
      expand: ['subscription'],
    })

    const userId = session.metadata?.userId
    if (!userId) {
      throw new Error('Stripe checkout session is missing metadata.userId.')
    }

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
    const selectedPriceId = session.metadata?.selectedPriceId ?? null
    const subscription = session.subscription

    if (!subscription || typeof subscription === 'string') {
      throw new Error('Stripe checkout session does not include an expanded subscription.')
    }

    return upsertSubscriptionFromStripe(userId, customerId, subscription, selectedPriceId)
  }

  const supabaseAdmin = getSupabaseAdminClient()
  const customerId = source.stripeCustomerId?.trim() || null

  if (customerId) {
    const activeSubscription = await findActiveSubscriptionByCustomer(customerId, stripe)
    if (activeSubscription) {
      return upsertSubscriptionFromStripe(source.userId, customerId, activeSubscription)
    }
  }

  if (source.email) {
    const customers = await stripe.customers.list({
      email: source.email,
      limit: 10,
    })

    for (const customer of customers.data) {
      const activeSubscription = await findActiveSubscriptionByCustomer(customer.id, stripe)
      if (activeSubscription) {
        return upsertSubscriptionFromStripe(source.userId, customer.id, activeSubscription)
      }
    }
  }

  return 'inactive' as const
}