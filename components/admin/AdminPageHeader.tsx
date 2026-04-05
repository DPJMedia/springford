"use client";

import { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  reserveActionsPanelSpace?: boolean;
}

export function AdminPageHeader({
  title,
  description,
  actions,
  reserveActionsPanelSpace = false,
}: AdminPageHeaderProps) {
  return (
    <div
      className={`mb-6 flex items-start justify-between gap-4 ${
        reserveActionsPanelSpace ? "xl:max-w-[calc(100%-17.5rem)]" : ""
      }`}
    >
      <div>
        <h1 className="text-2xl font-semibold text-[var(--admin-text)] mb-1">{title}</h1>
        {description && (
          <p className="text-sm text-[var(--admin-text-muted)]">{description}</p>
        )}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export default AdminPageHeader;
