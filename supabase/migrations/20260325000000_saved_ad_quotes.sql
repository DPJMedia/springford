-- Saved advertisement quotes (admin quoter): package JSON + client/dates metadata.

CREATE TABLE IF NOT EXISTS saved_ad_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  start_date DATE,
  end_date DATE,
  package_data JSONB NOT NULL,
  total_usd INTEGER,
  monthly_views_snapshot INTEGER
);

CREATE INDEX IF NOT EXISTS saved_ad_quotes_created_by_idx ON saved_ad_quotes (created_by);
CREATE INDEX IF NOT EXISTS saved_ad_quotes_updated_at_idx ON saved_ad_quotes (updated_at DESC);

ALTER TABLE saved_ad_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_ad_quotes_select" ON saved_ad_quotes;
DROP POLICY IF EXISTS "saved_ad_quotes_insert" ON saved_ad_quotes;
DROP POLICY IF EXISTS "saved_ad_quotes_update" ON saved_ad_quotes;
DROP POLICY IF EXISTS "saved_ad_quotes_delete" ON saved_ad_quotes;

CREATE POLICY "saved_ad_quotes_select"
  ON saved_ad_quotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND (up.is_admin OR up.is_super_admin)
    )
  );

CREATE POLICY "saved_ad_quotes_insert"
  ON saved_ad_quotes FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND (up.is_admin OR up.is_super_admin)
    )
  );

CREATE POLICY "saved_ad_quotes_update"
  ON saved_ad_quotes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND (up.is_admin OR up.is_super_admin)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND (up.is_admin OR up.is_super_admin)
    )
  );

CREATE POLICY "saved_ad_quotes_delete"
  ON saved_ad_quotes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND (up.is_admin OR up.is_super_admin)
    )
  );

CREATE OR REPLACE FUNCTION saved_ad_quotes_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS saved_ad_quotes_updated_at ON saved_ad_quotes;
CREATE TRIGGER saved_ad_quotes_updated_at
  BEFORE UPDATE ON saved_ad_quotes
  FOR EACH ROW
  EXECUTE FUNCTION saved_ad_quotes_set_updated_at();

COMMENT ON TABLE saved_ad_quotes IS 'Admin ad quoter: named quotes with package JSON and campaign dates';
