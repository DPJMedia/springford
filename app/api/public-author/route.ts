import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantForApiRoute } from "@/lib/tenant/getTenantForApiRoute";
import { allowRateLimit, getClientIp } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function GET(request: NextRequest) {
  if (!allowRateLimit(`public-author:${getClientIp(request)}`, 120, 60_000))
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const name = request.nextUrl.searchParams.get("name")?.trim().slice(0, 200);
  const username = request.nextUrl.searchParams
    .get("username")
    ?.trim()
    .slice(0, 100);
  if (!name && !username) return NextResponse.json({ author: null });
  const tenant = await getTenantForApiRoute();
  const admin = createAdminClient();
  // Derive candidates from actual published bylines for THIS publication.
  const { data: articles, error } = await admin
    .from("articles")
    .select("author_id, author_name")
    .eq("tenant_id", tenant.id)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .in("visibility", ["public", "newsletter_subscribers"])
    .limit(5000);
  if (error)
    return NextResponse.json(
      { error: "Could not load author" },
      { status: 503 },
    );
  const bylines = new Set(
    (articles ?? []).flatMap((a) =>
      String(a.author_name ?? "")
        .split(" & ")
        .map((n) => n.trim().toLowerCase()),
    ),
  );
  const ids = [
    ...new Set((articles ?? []).map((a) => a.author_id).filter(Boolean)),
  ];
  const profiles: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    email: string | null;
    newsletter_subscribed: boolean;
  }[] = [];
  const names = [
    ...new Set(
      (articles ?? [])
        .flatMap((a) =>
          String(a.author_name ?? "")
            .split(" & ")
            .map((n) => n.trim()),
        )
        .filter(Boolean),
    ),
  ];
  const fields =
    "id, full_name, username, avatar_url, email, newsletter_subscribed";
  for (const [column, values] of [
    ["id", ids],
    ["full_name", names],
    ["email", names.filter((n) => n.includes("@"))],
  ] as const) {
    for (let i = 0; i < values.length; i += 100) {
      const { data, error } = await admin
        .from("user_profiles")
        .select(fields)
        .in(column, values.slice(i, i + 100));
      if (error)
        return NextResponse.json(
          { error: "Could not load author" },
          { status: 503 },
        );
      profiles.push(...(data ?? []));
    }
  }
  const match = (profiles ?? []).find((p) => {
    if (
      !ids.includes(p.id) &&
      !bylines.has(
        String(p.full_name ?? "")
          .trim()
          .toLowerCase(),
      ) &&
      !bylines.has(String(p.email ?? "").toLowerCase())
    )
      return false;
    if (name)
      return [p.full_name, p.email].some(
        (v) => v?.trim().toLowerCase() === name.toLowerCase(),
      );
    return [
      p.username,
      slug(p.full_name ?? ""),
      slug((p.email ?? "").split("@")[0]),
    ].includes(username!);
  });
  if (!match) return NextResponse.json({ author: null });
  return NextResponse.json({
    author: {
      id: match.id,
      full_name: match.full_name,
      avatar_url: match.avatar_url,
      newsletter_subscribed: match.newsletter_subscribed === true,
      username:
        match.username ||
        slug((match.email ?? "").split("@")[0]) ||
        slug(match.full_name ?? ""),
    },
  });
}
