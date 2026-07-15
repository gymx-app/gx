-- ═══════════════════════════════════════════════════════════
-- CONDITIONING ITEMS (per-day) — Odin V2 conditioning/sport/
-- recovery day types (day_type: 'conditioning' | 'sport' |
-- 'recovery', and the conditioning[] half of 'combined' days)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS conditioning_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id uuid REFERENCES programmes(id) ON DELETE CASCADE,
  day_id uuid REFERENCES programme_days(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  conditioning_id text,
  activity_id text NOT NULL,
  activity_name text NOT NULL,
  conditioning_type text NOT NULL,
  purpose text,
  duration_min integer NOT NULL,
  target_rpe numeric,
  heart_rate_zone integer,
  intensity_description text,
  intervals jsonb,
  fatigue_cost text,
  rationale text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conditioning_items_day_id
  ON conditioning_items (day_id);

CREATE INDEX IF NOT EXISTS idx_conditioning_items_programme_id
  ON conditioning_items (programme_id);

ALTER TABLE conditioning_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users view own conditioning items" ON conditioning_items
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM programme_days pd
        JOIN programme_phases ph ON ph.id = pd.phase_id
        JOIN programmes p ON p.id = ph.programme_id
        WHERE pd.id = conditioning_items.day_id
        AND p.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
