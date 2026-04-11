"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

export type TenantContextValue = {
  id: string;
  name: string;
  slug: string;
  domain: string;
  from_email: string;
  from_name: string;
  section_config: Array<{ slug: string; label: string }>;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({
  value,
  children,
}: {
  value: TenantContextValue;
  children: ReactNode;
}) {
  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return ctx;
}
