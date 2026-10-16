import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const state = vi.hoisted(() => ({
  event: {
    id: "evt_test",
    type: "unused.event",
    data: { object: { id: "sub_test" } },
  },
  invalid: false,
  claimed: true,
  claimError: false,
  processed: false,
  checkpointError: false,
  deleted: false,
  clear: vi.fn(),
}));
vi.mock("stripe", () => ({
  default: class {
    webhooks = {
      constructEvent: () => {
        if (state.invalid) throw new Error("Bad signature");
        return state.event;
      },
    };
  },
}));
vi.mock("@/lib/support/stripeSubscriptionProfile", () => ({
  clearStripeSubscriptionFromProfile: state.clear,
  syncStripeSubscriptionToProfile: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: async () => ({
      data: state.claimed,
      error: state.claimError ? { message: "Unavailable" } : null,
    }),
    from: () => {
      let removing = false;
      const q = {
        update: () => q,
        delete: () => {
          removing = true;
          state.deleted = true;
          return q;
        },
        select: () => q,
        eq: () => q,
        is: () => q,
        maybeSingle: async () => ({
          data: { processed_at: state.processed ? "2026-10-16" : null },
          error: null,
        }),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(
            resolve({
              error:
                !removing && state.checkpointError
                  ? { message: "Unavailable" }
                  : null,
            }),
          ),
      };
      return q;
    },
  }),
}));
import { POST } from "@/app/api/webhooks/stripe/route";
const request = () =>
  new NextRequest("https://news.example.test/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "test" },
    body: "{}",
  });
beforeEach(() => {
  Object.assign(state, {
    event: {
      id: "evt_test",
      type: "unused.event",
      data: { object: { id: "sub_test" } },
    },
    invalid: false,
    claimed: true,
    claimError: false,
    processed: false,
    checkpointError: false,
    deleted: false,
  });
  state.clear.mockReset();
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "test-only");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("Stripe webhook acknowledgement", () => {
  it("rejects invalid signatures before claiming an event", async () => {
    state.invalid = true;
    expect((await POST(request())).status).toBe(400);
    expect(state.deleted).toBe(false);
  });
  it("asks Stripe to retry when the event cannot be recorded", async () => {
    state.claimError = true;
    expect((await POST(request())).status).toBe(503);
  });
  it("acknowledges an already completed event without running it again", async () => {
    state.claimed = false;
    state.processed = true;
    expect((await POST(request())).status).toBe(200);
    expect(state.clear).not.toHaveBeenCalled();
  });
  it("holds a duplicate while the first delivery is still processing", async () => {
    state.claimed = false;
    expect((await POST(request())).status).toBe(503);
  });
  it("does not acknowledge a failed subscription database synchronization", async () => {
    state.event.type = "customer.subscription.deleted";
    state.clear.mockRejectedValue(new Error("Database unavailable"));
    expect((await POST(request())).status).toBe(503);
    expect(state.deleted).toBe(true);
  });
  it("does not acknowledge failure to persist the completion checkpoint", async () => {
    state.checkpointError = true;
    expect((await POST(request())).status).toBe(503);
    expect(state.deleted).toBe(true);
  });
  it("acknowledges successful processing", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(state.deleted).toBe(false);
  });
});
