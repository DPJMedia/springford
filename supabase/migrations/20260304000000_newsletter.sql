CREATE TABLE IF NOT EXISTS newsletter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text,
  blocks jsonb NOT NULL DEFAULT '[]',
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  blocks jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'draft',
  template_id uuid REFERENCES newsletter_templates(id) ON DELETE SET NULL,
  sent_at timestamptz,
  recipient_count int,
  preview_text text,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE newsletter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_templates" ON newsletter_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true))
  );

CREATE POLICY "admins_all_campaigns" ON newsletter_campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true))
  );
