"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import type { SendGridCategoryMetrics } from "@/lib/newsletter/sendGridCampaign";

type CampaignRow = {
  id: string;
  name: string;
  subject: string;
  status: string;
  sent_at: string | null;
  recipient_count: number | null;
};

type EventRow = {
  id: string;
  email: string;
  event: string;
  url: string | null;
  reason: string | null;
  occurred_at: string;
};

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--admin-text)]">{value.toLocaleString()}</p>
    </div>
  );
}

function CampaignStatsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [aggregate, setAggregate] = useState<SendGridCategoryMetrics | null>(null);
  const [sendGridError, setSendGridError] = useState<string | null>(null);
  const [statsInfo, setStatsInfo] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [hint, setHint] = useState<string | null>(null);

  const clicksByUrl = useMemo(() => {
    const m = new Map<string, number>();
    for (const ev of events) {
      if (ev.event?.toLowerCase() !== "click" || !ev.url?.trim()) continue;
      const u = ev.url.trim();
      m.set(u, (m.get(u) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [events]);

  useEffect(() => {
    if (!campaignId) {
      setLoading(false);
      setError("Missing campaignId.");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/newsletter/campaign-stats?campaignId=${encodeURIComponent(campaignId)}`,
          { credentials: "include" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Could not load stats.");
          setLoading(false);
          return;
        }
        if (cancelled) return;
        setCampaign(data.campaign ?? null);
        setAggregate(data.aggregate ?? null);
        setSendGridError(typeof data.sendGridError === "string" ? data.sendGridError : null);
        setStatsInfo(typeof data.statsInfo === "string" ? data.statsInfo : null);
        setEvents(Array.isArray(data.events) ? data.events : []);
        setHint(typeof data.webhookConfiguredHint === "string" ? data.webhookConfiguredHint : null);
      } catch {
        if (!cancelled) setError("Network error.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  if (!campaignId) {
    return (
      <p className="text-sm text-[var(--admin-text-muted)]">
        <Link href="/admin/newsletter" className="text-[var(--admin-accent)] underline">
          Back to Newsletter
        </Link>
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {error}{" "}
        <Link href="/admin/newsletter" className="font-semibold text-[var(--admin-accent)] underline">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-[var(--admin-text)]">{campaign?.name ?? "Campaign"}</h2>
        {campaign?.subject ? (
          <p className="text-sm text-[var(--admin-text-muted)] mt-1">{campaign.subject}</p>
        ) : null}
        {campaign?.sent_at ? (
          <p className="text-xs text-[var(--admin-text-muted)] mt-2">
            Sent {new Date(campaign.sent_at).toLocaleString()} · Recipient count:{" "}
            {campaign.recipient_count?.toLocaleString() ?? "—"}
          </p>
        ) : null}
      </div>

      {statsInfo ? (
        <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-4 py-3 text-sm text-[var(--admin-text)]">
          {statsInfo}
        </div>
      ) : null}

      {sendGridError ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <p className="font-semibold">SendGrid request failed</p>
          <p className="mt-1 text-amber-200/90">{sendGridError}</p>
        </div>
      ) : null}

      {hint ? (
        <p className="text-xs text-[var(--admin-text-muted)] border border-[var(--admin-border)] rounded-lg px-3 py-2 bg-[var(--admin-table-header-bg)]">
          {hint}
        </p>
      ) : null}

      {aggregate ? (
        <div>
          <h3 className="text-base font-semibold text-white mb-3">SendGrid aggregates (this campaign)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <MetricCard label="Delivered" value={aggregate.delivered} />
            <MetricCard label="Unique opens" value={aggregate.unique_opens} />
            <MetricCard label="Unique clicks" value={aggregate.unique_clicks} />
            <MetricCard label="Opens (total)" value={aggregate.opens} />
            <MetricCard label="Clicks (total)" value={aggregate.clicks} />
            <MetricCard label="Bounces" value={aggregate.bounces} />
            <MetricCard label="Blocks / dropped" value={aggregate.blocks + aggregate.bounce_drops} />
            <MetricCard label="Spam reports" value={aggregate.spam_reports} />
            <MetricCard label="Unsubscribes" value={aggregate.unsubscribes} />
          </div>
          <p className="text-xs text-[var(--admin-text-muted)] mt-3">
            “Blocks” includes ISP blocks; unsubscribes may include list unsubscribes from the email footer. Email clients
            don’t report “delete without opening” to SendGrid.
          </p>
        </div>
      ) : !sendGridError && !statsInfo ? (
        <p className="text-sm text-[var(--admin-text-muted)]">No SendGrid category data for this campaign yet.</p>
      ) : null}

      <div>
        <h3 className="text-base font-semibold text-white mb-3">Per-recipient activity (webhook)</h3>
        <p className="text-xs text-[var(--admin-text-muted)] mb-3 max-w-3xl">
          When the Event Webhook is enabled, SendGrid records each <strong className="text-[var(--admin-text)]">click</strong>{" "}
          with the destination URL, so you can see which links were used (including multiple clicks on the same link).
        </p>
        {events.length === 0 ? (
          <p className="text-sm text-[var(--admin-text-muted)]">
            No stored events yet. Configure SendGrid Event Webhook (HTTP POST) to your site’s{" "}
            <code className="text-xs bg-[var(--admin-table-header-bg)] px-1 rounded">
              /api/webhooks/sendgrid?token=…
            </code>{" "}
            and set <code className="text-xs">SENDGRID_WEBHOOK_TOKEN</code> in the environment. Enable delivered, open,
            click, bounce, dropped, spam report, unsubscribe.
          </p>
        ) : (
          <>
          {clicksByUrl.length > 0 ? (
            <div className="mb-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-4">
              <h4 className="text-sm font-semibold text-[var(--admin-text)] mb-2">Clicks by link</h4>
              <ul className="space-y-2 text-sm">
                {clicksByUrl.map(([url, count]) => (
                  <li key={url} className="flex gap-3 justify-between items-start">
                    <span className="text-[var(--admin-accent)] break-all min-w-0">{url}</span>
                    <span className="shrink-0 tabular-nums font-semibold text-[var(--admin-text)]">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--admin-table-header-bg)] border-b border-[var(--admin-border)]">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-[var(--admin-text)] uppercase">Time</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-[var(--admin-text)] uppercase">Email</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-[var(--admin-text)] uppercase">Event</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-[var(--admin-text)] uppercase">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[var(--admin-table-row-hover)]">
                    <td className="px-4 py-2 text-[var(--admin-text-muted)] whitespace-nowrap">
                      {new Date(ev.occurred_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-[var(--admin-text)]">{ev.email}</td>
                    <td className="px-4 py-2 font-medium text-[var(--admin-text)]">{ev.event}</td>
                    <td className="px-4 py-2 text-[var(--admin-text-muted)] max-w-md truncate">
                      {ev.url || ev.reason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      <p>
        <button
          type="button"
          onClick={() => router.push("/admin/newsletter")}
          className="text-sm font-semibold text-[var(--admin-accent)] hover:underline"
        >
          ← Back to Newsletter
        </button>
      </p>
    </div>
  );
}

export default function CampaignStatsPage() {
  return (
    <>
      <AdminPageHeader
        title="Campaign email stats"
        description="SendGrid delivery and engagement for this newsletter send."
      />
      <AdminPageLayout>
        <Suspense
          fallback={
            <div className="flex min-h-[30vh] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
            </div>
          }
        >
          <CampaignStatsInner />
        </Suspense>
      </AdminPageLayout>
    </>
  );
}
