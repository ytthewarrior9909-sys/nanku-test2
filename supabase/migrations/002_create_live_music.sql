-- Live music schedule (7 days)
CREATE TABLE IF NOT EXISTS public.live_music_schedule (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week TEXT NOT NULL UNIQUE
              CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  is_active   BOOLEAN NOT NULL DEFAULT false,
  event_label TEXT NOT NULL DEFAULT 'Curated tropical playlist',
  start_time  TEXT NOT NULL DEFAULT 'All evening',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default 7 days
INSERT INTO public.live_music_schedule (day_of_week, is_active, event_label, start_time, sort_order) VALUES
  ('Monday',    true,  'Live Band',                 '7:00 PM',    1),
  ('Tuesday',   false, 'Curated tropical playlist', 'All evening',2),
  ('Wednesday', false, 'Curated tropical playlist', 'All evening',3),
  ('Thursday',  false, 'Curated tropical playlist', 'All evening',4),
  ('Friday',    false, 'Curated tropical playlist', 'All evening',5),
  ('Saturday',  true,  'Live Band',                 '7:00 PM',    6),
  ('Sunday',    false, 'Curated tropical playlist', 'All evening',7)
ON CONFLICT (day_of_week) DO NOTHING;

-- Auto-update updated_at
CREATE TRIGGER trg_live_music_schedule_updated_at
  BEFORE UPDATE ON public.live_music_schedule
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Weekly promotional events
CREATE TABLE IF NOT EXISTS public.weekly_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  subtitle    TEXT,
  image_url   TEXT,
  cta_link    TEXT,
  cta_text    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_weekly_events_updated_at
  BEFORE UPDATE ON public.weekly_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.live_music_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_events ENABLE ROW LEVEL SECURITY;

-- Public read (for the website)
CREATE POLICY "Public can read live music schedule"
  ON public.live_music_schedule FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public can read weekly events"
  ON public.weekly_events FOR SELECT TO anon, authenticated USING (true);

-- Admin full access
CREATE POLICY "Admins can manage live music schedule"
  ON public.live_music_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage weekly events"
  ON public.weekly_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
