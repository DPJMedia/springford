"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getTransactionalEmailPreviews } from "@/lib/emails/transactionalPreviews";

export default function EmailManagerPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const previews = useMemo(() => getTransactionalEmailPreviews(), []);
  const [selectedId, setSelectedId] = useState(previews[0]?.id ?? "");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?returnTo=/admin/email-manager");
        return;
      }
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("is_admin, is_super_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin && !profile?.is_super_admin) {
        router.replace("/");
        return;
      }
      setReady(true);
      setLoading(false);
    })();
  }, [router, supabase]);

  const selected = previews.find((p) => p.id === selectedId) ?? previews[0];
  const previewHtml = selected?.getHtml() ?? "";

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--color-riviera-blue)] border-r-transparent" />
      </div>
    );
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[color:var(--color-surface)]">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--color-dark)]">
              Email Manager
            </h1>
            <p className="mt-1 text-sm text-[color:var(--color-medium)] max-w-2xl">
              Preview every <strong>user-action</strong> email sent from this app (SendGrid): support
              receipts, subscription confirmations, newsletter subscribe/unsubscribe confirmations, etc. All use
              the same footer (site, terms, privacy, contact).{" "}
              <strong>Bulk newsletter campaigns</strong> (admin “send campaign”) are not listed — those are
              separate.
            </p>
            <p className="mt-2 text-xs text-[color:var(--color-medium)] max-w-2xl">
              Auth emails (sign-up confirmation, password reset, magic links) are configured in the{" "}
              <strong>Supabase Dashboard</strong> → Authentication → Email templates, not in this app.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-md border border-[color:var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-gray-50"
            >
              ← Admin home
            </Link>
            <Link
              href="/"
              className="rounded-md border border-[color:var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-gray-50"
            >
              Back to site
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="w-full shrink-0 lg:max-w-sm">
            <div className="rounded-lg border border-[color:var(--color-border)] bg-white p-2 shadow-sm">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-medium)]">
                Transactional emails
              </p>
              <ul className="space-y-1">
                {previews.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full rounded-md px-3 py-2.5 text-left text-sm transition ${
                        selectedId === p.id
                          ? "bg-[color:var(--color-riviera-blue)] text-white font-semibold"
                          : "text-[color:var(--color-dark)] hover:bg-gray-100"
                      }`}
                    >
                      {p.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <section className="min-w-0 flex-1 space-y-4">
            {selected && (
              <>
                <div className="rounded-lg border border-[color:var(--color-border)] bg-white p-4 shadow-sm">
                  <h2 className="text-lg font-semibold text-[color:var(--color-dark)]">
                    {selected.title}
                  </h2>
                  <p className="mt-1 text-sm text-[color:var(--color-medium)]">
                    {selected.description}
                  </p>
                  <p className="mt-3 text-xs font-mono text-[color:var(--color-dark)]">
                    <span className="font-sans font-semibold text-[color:var(--color-medium)]">
                      Subject:{" "}
                    </span>
                    {selected.subject}
                  </p>
                </div>

                <div className="overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-gray-200 shadow-inner">
                  <div className="border-b border-[color:var(--color-border)] bg-gray-100 px-3 py-2 text-xs text-[color:var(--color-medium)]">
                    Preview (same HTML as SendGrid)
                  </div>
                  <div
                    className="max-h-[min(720px,80vh)] overflow-auto bg-[#e8e8e8]"
                    // eslint-disable-next-line react/no-danger -- admin-only preview of our own email HTML
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
