-- Admin panel support tables/columns

ALTER TABLE public.draw_entries
ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.draws
ADD COLUMN IF NOT EXISTS payout_completed boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id integer PRIMARY KEY DEFAULT 1,
  draw_logic_mode text NOT NULL DEFAULT 'random' CHECK (draw_logic_mode IN ('random', 'algorithm')),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.admin_settings (id, draw_logic_mode)
VALUES (1, 'random')
ON CONFLICT (id) DO NOTHING;
