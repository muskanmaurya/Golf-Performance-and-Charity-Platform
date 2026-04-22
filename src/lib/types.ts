export type UserRole = 'user' | 'admin'
export type SubscriptionStatus = 'inactive' | 'active' | 'cancelled' | 'past_due'
export type DrawStatus = 'upcoming' | 'active' | 'completed' | 'cancelled'

export interface Profile {
  id: string
  email: string
  full_name: string
  display_name?: string | null
  role: UserRole
  subscription_status: SubscriptionStatus
  stripe_customer_id: string | null
  avatar_url: string
  preferred_charity_id?: string | null
  contribution_percent?: number | null
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  status: string
  plan_name: string
  amount_pence: number
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface GolfScore {
  id: string
  user_id: string
  score: number
  played_at: string
  course_name: string
  notes: string
  created_at: string
}

export interface Charity {
  id: string
  name: string
  description: string
  logo_url: string
  website_url: string
  is_active: boolean
  total_raised_pence: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Draw {
  id: string
  charity_id: string
  title: string
  description: string
  draw_date: string
  prize_description: string
  status: DrawStatus
  is_published?: boolean
  winning_numbers?: number[] | null
  total_prize_pool_pence?: number
  winner_user_id: string | null
  winner_announced_at: string | null
  payout_completed?: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  charity?: Charity
  entry_count?: number
  user_entered?: boolean
}

export interface DrawEntry {
  id: string
  draw_id: string
  user_id: string
  entered_at: string
}
