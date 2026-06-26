"use client";

import { useState } from "react";
import { useTenant } from "@/lib/tenant/TenantProvider";

const TOOLS = [
  {
    name: "search_articles",
    desc: "Search published articles by keyword, municipality, and date range. Returns headline, summary, and a canonical link.",
  },
  {
    name: "get_latest_articles",
    desc: "The most recently published articles, optionally filtered by municipality and/or a since-date.",
  },
  {
    name: "get_article",
    desc: "Fetch one published article in full (headline, byline, date, municipalities, full body) by slug.",
  },
  {
    name: "list_coverage_by_municipality",
    desc: "Coverage overview per municipality (article counts + recent headlines).",
  },
];

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mb-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text)]">
          {value}
        </code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* clipboard unavailable */
            }
          }}
          className="shrink-0 rounded-md border border-[var(--admin-accent)] px-3 py-2 text-sm font-semibold text-[var(--admin-accent)] hover:bg-[var(--admin-accent)]/10"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md border border-[var(--admin-border)] px-3 py-2 text-sm font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-table-header-bg)]"
        >
          Open
        </a>
      </div>
    </div>
  );
}

export default function McpAdminPage() {
  const tenant = useTenant();
  const siteUrl = `https://www.${tenant.domain.trim().toLowerCase()}`;
  const mcpUrl = `${siteUrl}/api/mcp`;
  const llmsUrl = `${siteUrl}/llms.txt`;

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-[var(--admin-text)]">AI Discovery (MCP)</h1>
      <p className="mb-6 text-sm text-[var(--admin-text-muted)]">
        These endpoints let AI assistants (ChatGPT, Claude, Perplexity, Google AI) read{" "}
        <strong>{tenant.name}</strong>&rsquo;s published articles directly and cite them, instead
        of scraping the site. They serve only published, public articles for this tenant.
      </p>

      <section className="mb-8 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-5">
        <h2 className="mb-3 text-lg font-semibold text-[var(--admin-text)]">Live endpoints</h2>
        <CopyRow label="MCP server (Streamable HTTP, read-only, no auth)" value={mcpUrl} />
        <CopyRow label="llms.txt (agent guide)" value={llmsUrl} />
        <CopyRow label="Sitemap" value={`${siteUrl}/sitemap.xml`} />
      </section>

      <section className="mb-8 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-5">
        <h2 className="mb-3 text-lg font-semibold text-[var(--admin-text)]">Available tools</h2>
        <ul className="space-y-3">
          {TOOLS.map((t) => (
            <li key={t.name}>
              <code className="text-sm font-semibold text-[var(--admin-accent)]">{t.name}</code>
              <p className="text-sm text-[var(--admin-text-muted)]">{t.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-5">
        <h2 className="mb-3 text-lg font-semibold text-[var(--admin-text)]">Publish to AI directories</h2>
        <p className="mb-2 text-sm text-[var(--admin-text-muted)]">
          The endpoints above work the moment they&rsquo;re deployed. To make this server
          discoverable in the public MCP Registry and connector directories (so agents can find
          it without being pointed at it), a one-time setup is needed:
        </p>
        <ol className="ml-5 list-decimal space-y-1 text-sm text-[var(--admin-text-muted)]">
          <li>
            Add a DNS TXT record on <code>{tenant.domain}</code> to verify the registry namespace
            (handled with the committed <code>server.json</code> and the <code>mcp-publisher</code> CLI).
          </li>
          <li>Submit the <code>{mcpUrl}</code> URL to PulseMCP, mcp.so, Glama, and Smithery.</li>
        </ol>
        <p className="mt-3 text-xs text-[var(--admin-text-muted)]">
          Crawler posture (which AI bots may read vs. train on the site) is controlled site-wide
          in <code>robots.txt</code>.
        </p>
      </section>
    </div>
  );
}
