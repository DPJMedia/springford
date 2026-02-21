import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const MIN_AMOUNT_CENTS = 500; // $5
const MAX_AMOUNT_CENTS = 100_000; // $1000

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const amountCents = Math.round(Number(body.amountCents) || 0);
    const customerEmail = typeof body.customerEmail === "string" && body.customerEmail.trim() ? body.customerEmail.trim() : undefined;

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

    const origin = request.headers.get("origin") || request.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ...(customerEmail && { customer_email: customerEmail }),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: "Support Spring-Ford Press",
              description: "One-time contribution to independent, neighborhood-first reporting.",
              images: origin ? [`${origin}/favicon.ico`] : undefined,
            },
          },
        },
      ],
      success_url: `${origin}/support?success=true`,
      cancel_url: `${origin}/support?canceled=true`,
      allow_promotion_codes: true,
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
