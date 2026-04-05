"use client";

import { ReactNode } from "react";

export type AdminLayoutCreateButton = {
  label: string;
  onClick?: () => void;
  href?: string;
};

interface AdminPageLayoutProps {
  children: ReactNode;
  actionsPanel?: ReactNode;
  /** Primary CTA stacked above the actions card on xl+; also shown on smaller screens inside the main column. */
  createButton?: AdminLayoutCreateButton;
  /** Applied to the xl right column (e.g. `xl:pt-11` to align with main content). */
  actionsColumnClassName?: string;
}

export function CreatePrimaryButton({
  spec,
  variant,
}: {
  spec: AdminLayoutCreateButton;
  variant: "stacked" | "mobile";
}) {
  const stacked =
    "flex w-full items-center justify-center py-2.5 px-3 text-sm font-semibold bg-[var(--admin-accent)] text-white hover:bg-[var(--admin-accent-hover)] transition";
  const mobile =
    "inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold bg-[var(--admin-accent)] text-white hover:bg-[var(--admin-accent-hover)] transition sm:w-auto";
  const shape =
    variant === "stacked"
      ? "rounded-t-lg rounded-b-none border border-[var(--admin-border)] border-b-0 shrink-0"
      : "";

  const className = variant === "stacked" ? `${stacked} ${shape}` : `${mobile}`;

  if (spec.href) {
    return (
      <a href={spec.href} className={className}>
        {spec.label}
      </a>
    );
  }
  return (
    <button type="button" onClick={spec.onClick} className={className}>
      {spec.label}
    </button>
  );
}

export function AdminPageLayout({
  children,
  actionsPanel,
  createButton,
  actionsColumnClassName = "",
}: AdminPageLayoutProps) {
  const showRightColumn = actionsPanel != null;

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        {createButton ? (
          <div className="mb-4 flex justify-end xl:hidden">
            <CreatePrimaryButton spec={createButton} variant="mobile" />
          </div>
        ) : null}
        {children}
      </div>

      {showRightColumn ? (
        <div className={`hidden w-64 shrink-0 xl:flex xl:flex-col ${actionsColumnClassName}`}>
          {createButton ? <CreatePrimaryButton spec={createButton} variant="stacked" /> : null}
          <div className="min-w-0 w-full">{actionsPanel}</div>
        </div>
      ) : null}
    </div>
  );
}
