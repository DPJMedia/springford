import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import {
  getTenant,
  getTenantBySlug,
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

  let tenant = null as Awaited<ReturnType<typeof getTenant>>;

  if (shouldUseSpringFordFallback(normalizedHost)) {
    tenant = await getTenantBySlug("spring-ford");
  } else {
    tenant = await getTenant(normalizedHost);
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
