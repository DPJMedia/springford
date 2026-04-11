"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { ProposalTextModal } from "@/components/ad-quoter/ProposalTextModal";
import { SavedQuoteDocumentModal } from "@/components/ad-quoter/SavedQuoteDocumentModal";
import { buildProposalTextFromSavedQuote } from "@/lib/advertising/packageQuoterModel";
import { formatSavedQuoteUpdatedAt } from "@/lib/advertising/formatQuoteDates";
import type { SavedAdQuote } from "@/lib/types/database";
import { useTenant } from "@/lib/tenant/TenantProvider";

function supabaseErrorMessage(err: unknown): string {
  if (err == null) return "Unknown error";
  if (typeof err === "object") {
    const o = err as { message?: string; details?: string; hint?: string };
    const parts = [o.message, o.details, o.hint].filter(
      (s): s is string => typeof s === "string" && s.length > 0,
    );
    if (parts.length) return parts.join(" — ");
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export default function SavedAdQuotesPage() {
  const router = useRouter();
  const supabase = createClient();
  const { id: tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SavedAdQuote[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [documentQuote, setDocumentQuote] = useState<SavedAdQuote | null>(null);
  const [proposalQuote, setProposalQuote] = useState<SavedAdQuote | null>(null);

  const legacyProposalMessage =
    "This saved quote uses legacy package data. Open it in the Ad Quoter to rebuild proposal text from the current calculator, or use View to see package line items.";

  const load = useCallback(async () => {
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from("saved_ad_quotes")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });
      if (error) {
        setFetchError(supabaseErrorMessage(error));
        setRows([]);
        return;
      }
      setRows((data ?? []) as SavedAdQuote[]);
    } catch (e) {
      setFetchError(supabaseErrorMessage(e));
      setRows([]);
    }
  }, [supabase, tenantId]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("is_admin, is_super_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.is_admin && !profile?.is_super_admin) {
        router.push("/");
        return;
      }
      await load();
      setLoading(false);
    })();
  }, [router, supabase, load]);

  async function performDelete(row: SavedAdQuote) {
    try {
      const { error } = await supabase
        .from("saved_ad_quotes")
        .delete()
        .eq("id", row.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      setDocumentQuote((q) => (q?.id === row.id ? null : q));
      await load();
    } catch (e) {
      window.alert(supabaseErrorMessage(e));
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Saved quotes"
        description="Open a saved advertisement quote from the list."
        actions={
          <Link
            href="/admin/ad-quoter"
            className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)] transition"
          >
            Back to Ad Quoter
          </Link>
        }
      />

      <AdminPageLayout>
        <div className="space-y-4">
          {fetchError ? (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              Could not load saved quotes: {fetchError}
            </div>
          ) : null}

          {rows.length === 0 && !fetchError ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No saved quotes yet. Save one from the Ad Quoter.</p>
          ) : (
            <ul className="divide-y divide-[var(--admin-border)] rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)]">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <button
                      type="button"
                      onClick={() => setDocumentQuote(row)}
                      className="text-left font-semibold text-[var(--admin-accent)] hover:underline"
                    >
                      {row.name}
                    </button>
                    <p className="text-xs text-[var(--admin-text-muted)]">
                      {row.client_name?.trim() || "—"} · {formatSavedQuoteUpdatedAt(row.updated_at)}
                      {row.total_usd != null ? ` · $${row.total_usd.toLocaleString()} campaign` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setDocumentQuote(row)}
                      className="rounded-md border border-[var(--admin-border)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => setProposalQuote(row)}
                      className="rounded-md border border-[var(--admin-border)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"
                    >
                      View text
                    </button>
                    <Link
                      href={`/admin/ad-quoter?edit=${row.id}`}
                      className="inline-flex items-center rounded-md border border-[var(--admin-accent)] bg-[var(--admin-accent)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--admin-accent)] hover:bg-[var(--admin-accent)]/20"
                    >
                      Edit
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AdminPageLayout>

      {documentQuote ? (
        <SavedQuoteDocumentModal
          row={documentQuote}
          onClose={() => setDocumentQuote(null)}
          onDelete={performDelete}
          onViewProposalText={(r) => {
            setDocumentQuote(null);
            setProposalQuote(r);
          }}
        />
      ) : null}

      {proposalQuote ? (
        <ProposalTextModal
          row={proposalQuote}
          body={buildProposalTextFromSavedQuote(proposalQuote)}
          legacyMessage={legacyProposalMessage}
          onClose={() => setProposalQuote(null)}
        />
      ) : null}
    </>
  );
}
