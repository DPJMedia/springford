"use client";

import { ReactNode } from "react";

interface ActionItem {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'default' | 'danger';
  badge?: string;
}

interface ActionSection {
  title: string;
  items?: ActionItem[];
  customContent?: ReactNode;
}

interface AdminActionsPanelProps {
  sections: ActionSection[];
  /** When true, top corners and top border are removed so the panel meets a primary button above. */
  attachBelowCreateButton?: boolean;
  /** When true, only section bodies render (no outer card). Use inside a parent that already has the shell border. */
  embedded?: boolean;
}

export function AdminActionsPanel({
  sections,
  attachBelowCreateButton,
  embedded,
}: AdminActionsPanelProps) {
  const sectionNodes = sections.map((section, idx) => (
    <div key={idx}>
      {idx > 0 && <div className="border-t border-[var(--admin-border)]" />}
      <div className="p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
          {section.title}
        </h3>
        {section.customContent ? (
          section.customContent
        ) : (
          <div className="space-y-1">
            {section.items?.map((item, itemIdx) => {
              const content = (
                <>
                  <div className="flex flex-1 items-center gap-2">
                    <div className={`w-4 h-4 ${item.variant === "danger" ? "text-red-400" : "text-[var(--admin-text-muted)]"}`}>
                      {item.icon}
                    </div>
                    <span className={`text-sm ${item.variant === "danger" ? "text-red-400" : "text-[var(--admin-text)]"}`}>
                      {item.label}
                    </span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-[var(--admin-accent)] px-2 py-0.5 text-xs font-medium text-black">
                      {item.badge}
                    </span>
                  )}
                </>
              );

              if (item.href) {
                const external = /^https?:\/\//i.test(item.href);
                return (
                  <a
                    key={itemIdx}
                    href={item.href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="flex cursor-pointer items-center rounded-md px-3 py-2 transition-colors hover:bg-[var(--admin-table-row-hover)]"
                  >
                    {content}
                  </a>
                );
              }

              return (
                <button
                  key={itemIdx}
                  type="button"
                  onClick={item.onClick}
                  className="flex w-full items-center rounded-md px-3 py-2 transition-colors hover:bg-[var(--admin-table-row-hover)]"
                >
                  {content}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  ));

  if (embedded) {
    return <div className="w-full">{sectionNodes}</div>;
  }

  return (
    <div className="w-64">
      <div
        className={`overflow-hidden bg-[var(--admin-card-bg)] border border-[var(--admin-border)] ${
          attachBelowCreateButton ? "rounded-b-lg rounded-t-none border-t-0" : "rounded-lg"
        }`}
      >
        {sectionNodes}
      </div>
    </div>
  );
}
