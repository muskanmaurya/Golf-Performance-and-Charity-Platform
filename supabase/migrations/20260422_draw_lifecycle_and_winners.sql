-- Draw lifecycle and winners support

ALTER TABLE public.draws
ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

ALTER TABLE public.draws
ADD COLUMN IF NOT EXISTS winning_numbers integer[];

ALTER TABLE public.draws
ADD COLUMN IF NOT EXISTS total_prize_pool_pence integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier text NOT NULL,
  match_count integer NOT NULL CHECK (match_count BETWEEN 3 AND 5),
  matched_numbers integer[] NOT NULL DEFAULT '{}',
  winning_numbers integer[] NOT NULL DEFAULT '{}',
  prize_pence integer NOT NULL DEFAULT 0,
  is_notified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(draw_id, user_id)
);

ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage winners"
  ON public.winners FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Users can view own winner rows"
  ON public.winners FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_winners_draw_id ON public.winners(draw_id);
CREATE INDEX IF NOT EXISTS idx_winners_user_id ON public.winners(user_id);
CREATE INDEX IF NOT EXISTS idx_draws_is_published ON public.draws(is_published);
CREATE INDEX IF NOT EXISTS idx_draws_draw_date ON public.draws(draw_date);
