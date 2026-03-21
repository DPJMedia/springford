import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const MIN_AMOUNT_CENTS = 500; // $5
const MAX_AMOUNT_CENTS = 100_000; // $1000

export type RecurringPlan =
  | "one_time"
  | "monthly_ongoing"
  | "monthly_limited"
  | "annual";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const body = await request.json();
    const amountCents = Math.round(Number(body.amountCents) || 0);
    const plan = (body.plan as RecurringPlan) || "one_time";
    const durationMonths =
      plan === "monthly_limited"
        ? Math.min(36, Math.max(1, Math.round(Number(body.durationMonths) || 3)))
        : undefined;

    if (amountCents < MIN_AMOUNT_CENTS) {
      return NextResponse.json(
        { error: `Minimum amount is $${MIN_AMOUNT_CENTS / 100}` },
        { status: 400 }
      );
    }
    if (amountCents > MAX_AMOUNT_CENTS) {
      return NextResponse.json(
        { error: `Maximum amount is $${MAX_AMOUNT_CENTS / 100}` },
        { status: 400 }
      );
    }

    const origin =
      request.headers.get("origin") || request.nextUrl.origin || "";

    const metadata = { supabase_user_id: user.id };

    if (plan === "one_time") {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: amountCents,
              product_data: {
                name: "Support Spring-Ford Press",
                description:
                  "One-time contribution to independent, neighborhood-first reporting.",
                images: origin ? [`${origin}/favicon.ico`] : undefined,
              },
            },
          },
        ],
        success_url: `${origin}/support?success=true`,
        cancel_url: `${origin}/support?canceled=true`,
        allow_promotion_codes: true,
        metadata,
      });

      return NextResponse.json({ url: session.url });
    }

    const recurringBlock: Stripe.Checkout.SessionCreateParams.LineItem["price_data"] = {
      currency: "usd",
      unit_amount: amountCents,
      recurring:
        plan === "annual"
          ? { interval: "year", interval_count: 1 }
          : { interval: "month", interval_count: 1 },
      product_data: {
        name: "Support Spring-Ford Press (recurring)",
        description:
          plan === "annual"
            ? "Annual recurring support — renews each year until canceled."
            : plan === "monthly_limited" && durationMonths
              ? `Monthly recurring support for ${durationMonths} month${durationMonths === 1 ? "" : "s"}, then ends automatically.`
              : "Monthly recurring support — renews each month until canceled.",
        images: origin ? [`${origin}/favicon.ico`] : undefined,
      },
    };

    // Note: Stripe Checkout does not accept subscription_data.cancel_at — fixed-term
    // monthly plans get cancel_at applied in the webhook after the subscription exists.
    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: {
        ...metadata,
        plan,
        ...(durationMonths ? { duration_months: String(durationMonths) } : {}),
      },
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: recurringBlock,
        },
      ],
      subscription_data: subscriptionData,
      success_url: `${origin}/support?success=true&recurring=1`,
      cancel_url: `${origin}/support?canceled=true`,
      allow_promotion_codes: true,
      metadata: {
        ...metadata,
        plan,
        ...(durationMonths ? { duration_months: String(durationMonths) } : {}),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe Checkout error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment setup failed" },
      { status: 500 }
    );
  }
}
