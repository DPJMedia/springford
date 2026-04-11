"use client";

import { useCallback, useEffect, useState } from "react";

export type TenantMemberRow = {
  user_id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_super_admin?: boolean;
  created_at: string;
};

export function TenantMembersSection({ tenantId }: { tenantId: string }) {
  const [members, setMembers] = useState<TenantMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor">("editor");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [roleUpdatingUserId, setRoleUpdatingUserId] = useState<string | null>(null);
  const [roleFeedback, setRoleFeedback] = useState<{ userId: string; kind: "ok" | "err"; message: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/admin/tenants/${tenantId}/members`, {
      credentials: "include",
    });
    const j = await res.json();
    if (!res.ok) {
      setError(typeof j.error === "string" ? j.error : "Failed to load members.");
      setMembers([]);
      return;
    }
    setMembers(Array.isArray(j.members) ? j.members : []);
  }, [tenantId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/members`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const j = await res.json();
      if (!res.ok) {
        setFormError(typeof j.error === "string" ? j.error : "Could not add member.");
        return;
      }
      setEmail("");
      setRole("editor");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function patchRole(userId: string, newRole: "admin" | "editor") {
    const current = members.find((m) => m.user_id === userId);
    if (!current || current.is_super_admin || current.role === newRole) return;
    setRoleFeedback(null);
    setRoleUpdatingUserId(userId);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/members/${userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setRoleFeedback({
          userId,
          kind: "err",
          message: typeof j.error === "string" ? j.error : "Could not update role.",
        });
        return;
      }
      setRoleFeedback({ userId, kind: "ok", message: "Role updated." });
      await load();
    } finally {
      setRoleUpdatingUserId(null);
    }
  }

  async function confirmRemove(userId: string) {
    setRemovingUserId(userId);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/members/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(typeof j.error === "string" ? j.error : "Remove failed.");
      } else {
        setConfirmRemoveUserId(null);
        await load();
      }
    } finally {
      setRemovingUserId(null);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-6 space-y-6">
      <h2 className="text-lg font-semibold text-white m-0">Members</h2>
      <p className="text-sm text-[var(--admin-text-muted)] m-0">
        Admins and editors for this site. Open a tenant from the list to change access; newsletter-only
        readers are not shown here.
      </p>

      {error && (
        <div className="rounded-md border border-red-800/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 border-b border-[var(--admin-border)] pb-6">
        <label className="min-w-[12rem] flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text)]"
          />
        </label>
        <label className="w-40">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
            Role
          </span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "editor")}
            className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text)]"
          >
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="rounded-md bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add member"}
        </button>
        {formError && (
          <p className="w-full m-0 text-sm text-red-400">{formError}</p>
        )}
      </form>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--admin-border)]">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-table-header-bg)]">
                <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Name</th>
                <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Email</th>
                <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Role</th>
                <th className="px-3 py-2 font-semibold text-[var(--admin-text)]">Date added</th>
                <th className="px-3 py-2 font-semibold text-[var(--admin-text)] w-24" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.user_id}
                  className="border-b border-[var(--admin-border)] hover:bg-[var(--admin-table-row-hover)]"
                >
                  <td className="px-3 py-2 text-[var(--admin-text)]">
                    {m.full_name || "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--admin-text-muted)]">{m.email}</td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      {m.is_super_admin ? (
                        <span className="inline-block w-fit rounded border border-violet-500/40 bg-violet-950/50 px-2 py-0.5 text-xs font-semibold text-violet-200">
                          Super Admin
                        </span>
                      ) : (
                        <>
                          <select
                            value={m.role === "admin" ? "admin" : "editor"}
                            disabled={roleUpdatingUserId === m.user_id}
                            onChange={(e) => {
                              const v = e.target.value === "admin" ? "admin" : "editor";
                              void patchRole(m.user_id, v);
                            }}
                            className="max-w-[10rem] rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-2 py-1 text-sm capitalize text-[var(--admin-text)] disabled:opacity-50"
                            aria-label={`Role for ${m.email}`}
                          >
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                          {roleFeedback?.userId === m.user_id ? (
                            <span
                              className={
                                roleFeedback.kind === "ok"
                                  ? "text-xs text-emerald-400/90"
                                  : "text-xs text-red-400"
                              }
                            >
                              {roleFeedback.message}
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[var(--admin-text-muted)] tabular-nums">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    {confirmRemoveUserId === m.user_id ? (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <span className="text-xs text-[var(--admin-text-muted)]">Remove this member?</span>
                        <button
                          type="button"
                          disabled={removingUserId === m.user_id}
                          onClick={() => setConfirmRemoveUserId(null)}
                          className="text-sm font-semibold text-[var(--admin-text-muted)] hover:underline disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={removingUserId === m.user_id}
                          onClick={() => void confirmRemove(m.user_id)}
                          className="text-sm font-semibold text-red-400 hover:underline disabled:opacity-50"
                        >
                          {removingUserId === m.user_id ? "Removing…" : "Confirm"}
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveUserId(m.user_id)}
                        className="text-sm font-semibold text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {members.length === 0 && (
            <p className="p-6 text-center text-sm text-[var(--admin-text-muted)] m-0">
              No admins or editors yet.
            </p>
          )}
        </div>
      )}

    </div>
  );
}
