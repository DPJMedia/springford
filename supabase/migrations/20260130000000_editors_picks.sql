-- Editors Picks: Store article IDs in DB so they persist and are visible to all users
-- Replaces localStorage-based approach

CREATE TABLE IF NOT EXISTS editors_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  position int NOT NULL CHECK (position >= 1 AND position <= 3),
  created_at timestamptz DEFAULT now(),
  UNIQUE(position)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_editors_picks_position ON editors_picks(position);

-- RLS: Anyone can read editors picks (public), only admins can modify
ALTER TABLE editors_picks ENABLE ROW LEVEL SECURITY;

-- Allow public read (including anonymous)
CREATE POLICY "Editors picks are publicly readable"
  ON editors_picks FOR SELECT
  USING (true);

-- Only admins/super_admins can insert
CREATE POLICY "Admins can insert editors picks"
  ON editors_picks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Only admins/super_admins can update
CREATE POLICY "Admins can update editors picks"
  ON editors_picks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Only admins/super_admins can delete
CREATE POLICY "Admins can delete editors picks"
  ON editors_picks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );
