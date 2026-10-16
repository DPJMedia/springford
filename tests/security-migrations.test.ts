import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import schema from "./fixtures/schema.json";
const db = new PGlite();
const tenantA = "10000000-0000-4000-8000-000000000001",
  tenantB = "10000000-0000-4000-8000-000000000002";
const reader = "20000000-0000-4000-8000-000000000001",
  staff = "20000000-0000-4000-8000-000000000002",
  owner = "20000000-0000-4000-8000-000000000003";
async function asRole(role: string, uid: string | null, sql: string) {
  await db.exec(
    `SET ROLE ${role}; SELECT set_config('request.jwt.claim.sub','${uid || ""}',false); SELECT set_config('request.jwt.claim.role','${role}',false);`,
  );
  try {
    return await db.query(sql);
  } finally {
    await db.exec("RESET ROLE;");
  }
}
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA storage;CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner_id text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;GRANT USAGE ON SCHEMA storage TO anon,authenticated,service_role;GRANT ALL ON storage.objects TO anon,authenticated,service_role;CREATE POLICY public_media_read ON storage.objects FOR SELECT USING(true);CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;`);
  const tables = new Map<string, typeof schema>();
  for (const c of schema) {
    const rows = tables.get(c.table_name) || [];
    rows.push(c);
    tables.set(c.table_name, rows);
  }
  for (const [name, columns] of tables) {
    const cols = columns.map(
      (c) =>
        `"${c.column_name}" ${c.data_type === "USER-DEFINED" ? "text" : c.data_type === "ARRAY" ? "text[]" : c.data_type}${c.column_name === "id" ? " PRIMARY KEY" : ""}`,
    );
    await db.exec(`CREATE TABLE public."${name}"(${cols.join(",")});`);
  }
  await db.exec(`GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;
 ALTER TABLE public.tenant_newsletter_subscriptions ALTER id SET DEFAULT gen_random_uuid();
 CREATE UNIQUE INDEX ON public.tenant_newsletter_subscriptions(user_id,tenant_id);
 INSERT INTO auth.users VALUES('${reader}'),('${staff}'),('${owner}');
 INSERT INTO tenants(id,name,slug,domain,is_active)VALUES('${tenantA}','A','a','a.test',true),('${tenantB}','B','b','b.test',true);
 INSERT INTO user_profiles(id,email,username,full_name,is_admin,is_super_admin)VALUES('${reader}','reader@example.test','reader','Reader',false,false),('${staff}','staff@example.test','staff','Staff',true,false),('${owner}','owner@example.test','owner','Owner',true,true);
 INSERT INTO tenant_memberships(id,user_id,tenant_id,role)VALUES(gen_random_uuid(),'${staff}','${tenantA}','editor');
 INSERT INTO articles(id,tenant_id,title,slug,status,visibility,published_at,content)VALUES
 ('30000000-0000-4000-8000-000000000001','${tenantA}','Public','public','published','public',now()-interval '1 day','public body'),
 ('30000000-0000-4000-8000-000000000002','${tenantA}','Subscriber','subscriber','published','newsletter_subscribers',now()-interval '1 day','subscriber body'),
 ('30000000-0000-4000-8000-000000000003','${tenantB}','Private','private','published','admin_only',now()-interval '1 day','private body');
 ALTER TABLE ads ENABLE ROW LEVEL SECURITY; ALTER TABLE ad_settings ENABLE ROW LEVEL SECURITY; ALTER TABLE ad_slot_assignments ENABLE ROW LEVEL SECURITY;
 CREATE FUNCTION get_admin_analytics_dashboard(timestamptz,timestamptz,timestamptz,timestamptz,text,integer,uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::jsonb $$;
 CREATE FUNCTION get_admin_user_ids() RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT id FROM user_profiles WHERE is_admin $$;
 CREATE FUNCTION get_super_admin_user_ids() RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT id FROM user_profiles WHERE is_super_admin $$;
 CREATE FUNCTION auto_publish_scheduled_articles() RETURNS void LANGUAGE sql AS $$ SELECT $$;
 CREATE POLICY "unsafe profiles" ON user_profiles FOR SELECT USING(true);
 CREATE POLICY "unsafe articles update" ON articles FOR UPDATE USING(true) WITH CHECK(true);
 `);
  for (const name of [
    "20261015230000_immediate_security_guards.sql",
    "20261016000000_security_foundations.sql",
    "20261016004000_article_preview_author.sql",
    "20261016005000_storage_write_guards.sql",
    "20261016010000_private_data_access.sql",
  ])
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${name}`, import.meta.url),
        "utf8",
      ),
    );
});
afterAll(async () => db.close());
describe("private data boundaries", () => {
  it("preserves own-avatar uploads and blocks overwriting someone else’s media", async () => {
    await asRole(
      "authenticated",
      reader,
      `INSERT INTO storage.objects(bucket_id,name,owner_id)VALUES('avatars','${reader}-test.jpg','${reader}')`,
    );
    await expect(
      asRole(
        "anon",
        null,
        `INSERT INTO storage.objects(bucket_id,name)VALUES('avatars','public/injected.jpg')`,
      ),
    ).rejects.toThrow();
    await expect(
      asRole(
        "authenticated",
        reader,
        `INSERT INTO storage.objects(bucket_id,name)VALUES('avatars','${owner}-test.jpg')`,
      ),
    ).rejects.toThrow();
    expect(
      (
        await asRole(
          "authenticated",
          staff,
          `DELETE FROM storage.objects WHERE name='${reader}-test.jpg' RETURNING id`,
        )
      ).rows,
    ).toEqual([]);
    await expect(
      asRole(
        "authenticated",
        reader,
        `INSERT INTO storage.objects(bucket_id,name)VALUES('ads','injected.jpg')`,
      ),
    ).rejects.toThrow();
    await expect(
      asRole(
        "authenticated",
        reader,
        `INSERT INTO storage.objects(bucket_id,name)VALUES('author-images','injected.jpg')`,
      ),
    ).rejects.toThrow();
    await asRole(
      "authenticated",
      owner,
      `INSERT INTO storage.objects(bucket_id,name)VALUES('ads','admin-upload.jpg')`,
    );
    expect(
      (
        await asRole(
          "anon",
          null,
          "SELECT name FROM storage.objects WHERE bucket_id='ads'",
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("rejects anonymous calls to the user-deletion RPC", async () => {
    await expect(
      asRole(
        "anon",
        null,
        "SELECT delete_user_as_admin('ffffffff-ffff-4fff-8fff-ffffffffffff')",
      ),
    ).rejects.toThrow();
  });
  it("rejects non-admin calls to the user-deletion RPC", async () => {
    await expect(
      asRole(
        "authenticated",
        reader,
        "SELECT delete_user_as_admin('ffffffff-ffff-4fff-8fff-ffffffffffff')",
      ),
    ).rejects.toThrow("Only super admins");
  });
  it("blocks ordinary customers from creating or changing ads", async () => {
    await expect(
      asRole(
        "authenticated",
        reader,
        "INSERT INTO ads(id,title)VALUES('ffffffff-ffff-4fff-8fff-ffffffffffff','Injected')",
      ),
    ).rejects.toThrow();
  });

  it("hides profiles, preferences and staff memberships from anonymous readers", async () => {
    for (const t of [
      "user_profiles",
      "tenant_newsletter_subscriptions",
      "tenant_memberships",
    ])
      expect((await asRole("anon", null, `SELECT * FROM ${t}`)).rows).toEqual(
        [],
      );
  });
  it("allows a customer to read and edit their own profile", async () => {
    expect(
      (await asRole("authenticated", reader, "SELECT id FROM user_profiles"))
        .rows,
    ).toEqual([{ id: reader }]);
    await asRole(
      "authenticated",
      reader,
      `UPDATE user_profiles SET full_name='New name' WHERE id='${reader}'`,
    );
    expect(
      (
        await db.query(
          `SELECT full_name FROM user_profiles WHERE id='${reader}'`,
        )
      ).rows,
    ).toEqual([{ full_name: "New name" }]);
  });
  it("prevents self-promotion and changing billing fields", async () => {
    await expect(
      asRole(
        "authenticated",
        reader,
        `UPDATE user_profiles SET is_super_admin=true WHERE id='${reader}'`,
      ),
    ).rejects.toThrow("Protected profile fields");
    await expect(
      asRole(
        "authenticated",
        reader,
        `UPDATE user_profiles SET stripe_customer_id='forged' WHERE id='${reader}'`,
      ),
    ).rejects.toThrow("Protected profile fields");
  });
  it("preserves super-admin user management", async () => {
    expect(
      (await asRole("authenticated", owner, "SELECT id FROM user_profiles"))
        .rows,
    ).toHaveLength(3);
  });
  it("shows subscriber teasers without delivering subscriber bodies", async () => {
    expect(
      (await asRole("anon", null, "SELECT author_id FROM article_previews"))
        .rows,
    ).toHaveLength(2);
    const previews = await asRole(
      "anon",
      null,
      "SELECT title FROM article_previews ORDER BY title",
    );
    expect(previews.rows).toEqual([
      { title: "Public" },
      { title: "Subscriber" },
    ]);
    expect(
      (await asRole("anon", null, "SELECT content FROM articles")).rows,
    ).toEqual([{ content: "public body" }]);
    await expect(
      asRole("anon", null, "SELECT content FROM article_previews"),
    ).rejects.toThrow();
  });
  it("preserves public article reading and tenant staff editing", async () => {
    const result = await asRole(
      "authenticated",
      staff,
      "UPDATE articles SET title='Edited' WHERE slug='public' RETURNING title",
    );
    expect(result.rows).toEqual([{ title: "Edited" }]);
    const cross = await asRole(
      "authenticated",
      staff,
      "UPDATE articles SET title='Forbidden' WHERE slug='private' RETURNING id",
    );
    expect(cross.rows).toEqual([]);
  });
  it("lets only subscribers of the matching tenant read its restricted body", async () => {
    await db.exec(
      `INSERT INTO tenant_newsletter_subscriptions(user_id,tenant_id,subscribed)VALUES('${reader}','${tenantA}',true)`,
    );
    expect(
      (
        await asRole(
          "authenticated",
          reader,
          "SELECT content FROM articles WHERE slug='subscriber'",
        )
      ).rows,
    ).toEqual([{ content: "subscriber body" }]);
  });
  it("blocks anonymous article mutations while preserving public previews", async () => {
    expect(
      (
        await asRole(
          "anon",
          null,
          "UPDATE articles SET title='Injected' WHERE slug='public' RETURNING id",
        )
      ).rows,
    ).toEqual([]);
  });
  it("checks username availability without exposing profiles", async () => {
    expect(
      (
        await asRole(
          "anon",
          null,
          "SELECT is_username_available('reader') AS available",
        )
      ).rows,
    ).toEqual([{ available: false }]);
    expect(
      (
        await asRole(
          "anon",
          null,
          "SELECT is_username_available('new_reader') AS available",
        )
      ).rows,
    ).toEqual([{ available: true }]);
  });
  it("preserves other publication subscriptions when a reader opts out", async () => {
    await asRole(
      "authenticated",
      reader,
      `SELECT set_newsletter_subscription('${tenantA}',true)`,
    );
    await asRole(
      "authenticated",
      reader,
      `SELECT set_newsletter_subscription('${tenantB}',true)`,
    );
    await asRole(
      "authenticated",
      reader,
      `SELECT set_newsletter_subscription('${tenantA}',false)`,
    );
    expect(
      (
        await asRole(
          "authenticated",
          reader,
          `SELECT subscribed FROM tenant_newsletter_subscriptions WHERE tenant_id='${tenantB}'`,
        )
      ).rows,
    ).toEqual([{ subscribed: true }]);
    expect(
      (
        await asRole(
          "authenticated",
          reader,
          `SELECT newsletter_subscribed FROM user_profiles WHERE id='${reader}'`,
        )
      ).rows,
    ).toEqual([{ newsletter_subscribed: true }]);
  });
  it("does not apply an old suppression over newer consent", async () => {
    await db.exec(
      `UPDATE tenant_newsletter_subscriptions SET subscribed=true,subscribed_at=now() WHERE user_id='${reader}'`,
    );
    await asRole(
      "service_role",
      null,
      `SELECT apply_newsletter_suppression('${reader}',NULL,now()-interval '1 day')`,
    );
    expect(
      (
        await asRole(
          "authenticated",
          reader,
          "SELECT subscribed FROM tenant_newsletter_subscriptions",
        )
      ).rows,
    ).toEqual([{ subscribed: true }, { subscribed: true }]);
  });
  it("does not let a reader assign staff membership", async () => {
    await expect(
      asRole(
        "authenticated",
        reader,
        `INSERT INTO tenant_memberships(id,user_id,tenant_id,role)VALUES(gen_random_uuid(),'${reader}','${tenantB}','admin')`,
      ),
    ).rejects.toThrow();
  });
  it("prevents publication staff from scheduling network-wide mail", async () => {
    await asRole(
      "authenticated",
      staff,
      `INSERT INTO newsletter_campaigns(id,tenant_id,name,recipients_type,status)VALUES(gen_random_uuid(),'${tenantA}','Local','newsletter','draft')`,
    );
    await expect(
      asRole(
        "authenticated",
        staff,
        `INSERT INTO newsletter_campaigns(id,tenant_id,name,recipients_type,status)VALUES(gen_random_uuid(),'${tenantA}','Network','all_users','scheduled')`,
      ),
    ).rejects.toThrow();
  });
  it("blocks anonymous analytics reads and writes", async () => {
    await expect(
      asRole("anon", null, "SELECT * FROM page_views"),
    ).rejects.toThrow();
    await expect(
      asRole(
        "anon",
        null,
        "INSERT INTO page_views(id)VALUES(gen_random_uuid())",
      ),
    ).rejects.toThrow();
  });
  it("limits request budgets across independent requests", async () => {
    expect(
      (
        await asRole(
          "service_role",
          null,
          "SELECT take_rate_limit('test',1,60) AS allowed",
        )
      ).rows,
    ).toEqual([{ allowed: true }]);
    expect(
      (
        await asRole(
          "service_role",
          null,
          "SELECT take_rate_limit('test',1,60) AS allowed",
        )
      ).rows,
    ).toEqual([{ allowed: false }]);
    await expect(
      asRole("anon", null, "SELECT take_rate_limit('test',1,60)"),
    ).rejects.toThrow();
  });
});
