/** Canonical public origin for a tenant domain (apex stored without www). */
export function tenantPublicOrigin(domain: string): string {
  const d = domain.trim().toLowerCase().replace(/^www\./, "");
  return `https://www.${d}`;
}
