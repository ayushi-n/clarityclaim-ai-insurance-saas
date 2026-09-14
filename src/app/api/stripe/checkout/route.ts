import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Stripe from "stripe";
import { authOptions } from "@/lib/auth";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// POST /api/stripe/checkout — creates a Checkout session for the Growth
// plan and returns the URL to redirect the browser to. Requires
// STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PRICE_GROWTH to be set.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!stripe || !process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH) {
    return NextResponse.json(
      { error: "Stripe isn't configured yet. Set STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PRICE_GROWTH." },
      { status: 501 }
    );
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH, quantity: 1 }],
    client_reference_id: session.user.organizationId,
    success_url: `${process.env.NEXTAUTH_URL}/dashboard/settings?upgraded=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/settings`,
  });

  return NextResponse.json({ url: checkout.url });
}
