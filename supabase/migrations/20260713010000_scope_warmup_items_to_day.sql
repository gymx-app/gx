-- warmup_items was programme-wide (one sampled day's warmup shown for every
-- day of the programme, regardless of day type) and dropped component_type /
-- related_exercise_id / intensity, making a ramp-up set for the day's own
-- main lift indistinguishable from a duplicate working set. Scope it to the
-- day like cooldown_items already is, and carry the fields needed to render
-- ramp-up sets distinctly.

ALTER TABLE warmup_items
  ADD COLUMN IF NOT EXISTS day_id uuid REFERENCES programme_days(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS component_type text,
  ADD COLUMN IF NOT EXISTS related_exercise_id text,
  ADD COLUMN IF NOT EXISTS intensity_label text;

CREATE INDEX IF NOT EXISTS idx_warmup_items_day_id ON warmup_items (day_id);

ALTER TABLE warmup_items DROP CONSTRAINT IF EXISTS warmup_items_programme_id_item_key_key;
ALTER TABLE warmup_items ADD CONSTRAINT warmup_items_day_id_item_key_key UNIQUE (day_id, item_key);

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users view own warmup items" ON warmup_items;
  CREATE POLICY "Users view own warmup items" ON warmup_items
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM programme_days pd
        JOIN programme_phases ph ON ph.id = pd.phase_id
        JOIN programmes p ON p.id = ph.programme_id
        WHERE pd.id = warmup_items.day_id
        AND p.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
