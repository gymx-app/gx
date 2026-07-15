-- Odin v2's build step returns a baseline_session (Day 0 strength test) when
-- baseline_path is 'day_one_test'. Store it alongside the programme so the
-- Today tab can surface it before Week 1 starts.
ALTER TABLE programmes
  ADD COLUMN IF NOT EXISTS baseline_session jsonb;
