import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import {
  fetchFirstActiveTenant,
  fetchTenantByDomain,
  fetchTenantBySlug,
  normalizeDomainForLookup,
} from "./lib/tenant/getTenant";

function isLocalhostOrLoopback(normalizedHost: string): boolean {
  return (
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost === "[::1]" ||
    normalizedHost === "::1"
  );
}

function isVercelPreviewHost(normalizedHost: string): boolean {
  return normalizedHost.endsWith(".vercel.app");
}

function shouldUseSpringFordFallback(normalizedHost: string): boolean {
  return isLocalhostOrLoopback(normalizedHost) || isVercelPreviewHost(normalizedHost);
}

export async function middleware(request: NextRequest) {
  const hostHeader = request.headers.get("host") ?? "";
  const normalizedHost = normalizeDomainForLookup(hostHeader);

  let tenant = null as Awaited<ReturnType<typeof fetchTenantBySlug>>;

  if (shouldUseSpringFordFallback(normalizedHost)) {
    const slugOverride =
      process.env.NEXT_PUBLIC_LOCAL_TENANT_SLUG?.trim() || "spring-ford";
    tenant = await fetchTenantBySlug(slugOverride);
    // localhost only: if this DB has no row for that slug, use the first active tenant so `npm run dev` works.
    if (!tenant && isLocalhostOrLoopback(normalizedHost) && process.env.NODE_ENV === "development") {
      tenant = await fetchFirstActiveTenant();
    }
  } else {
    tenant = await fetchTenantByDomain(normalizedHost);
  }

  if (!tenant) {
    return new NextResponse("Site not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenant.id);
  requestHeaders.set("x-tenant-slug", tenant.slug);

  const requestWithTenant = new NextRequest(request.url, {
    headers: requestHeaders,
  });

  return await updateSession(requestWithTenant);
}

export const config = {
  matcher: [
    /*
     * Exclude the entire /_next/* tree (not only static + image). Webpack/Turbopack
     * dev uses /_next/webpack-hmr, manifests, and other paths; running tenant +
     * Supabase middleware on those requests breaks chunk loading and HMR.
     */
    "/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
