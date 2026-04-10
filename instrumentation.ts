/**
 * Runs once when the Node.js runtime starts (not in Edge).
 * Logs config gaps in production — does not throw (avoids breaking deploys).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const prod =
    process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

  if (!prod) {
    return;
  }

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ] as const;

  for (const key of required) {
    if (!process.env[key]) {
      console.error(`[instrumentation] Missing required env: ${key}`);
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "[instrumentation] SUPABASE_SERVICE_ROLE_KEY is not set — server routes that need elevated access may fail"
    );
  }

  if (!process.env.CRON_SECRET) {
    console.warn(
      "[instrumentation] CRON_SECRET is not set — /api/newsletter/send-scheduled returns 503 in production until it is set (Vercel cron sends this header automatically when the env var exists)"
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn(
      "[instrumentation] STRIPE_WEBHOOK_SECRET is not set — Stripe webhooks will fail"
    );
  }
}
