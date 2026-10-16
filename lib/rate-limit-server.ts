import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
export async function consumeRateLimit(
  key: string,
  limit: number,
  seconds: number,
): Promise<boolean> {
  const digest = createHash("sha256").update(key).digest("hex");
  const { data, error } = await createAdminClient().rpc("take_rate_limit", {
    p_key: digest,
    p_limit: limit,
    p_window_seconds: seconds,
  });
  if (error) throw new Error("Rate limit service unavailable");
  return data === true;
}
