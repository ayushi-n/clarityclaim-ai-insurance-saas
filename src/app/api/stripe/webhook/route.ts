import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function POST(req: Request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe isn't configured yet." }, { status: 501 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature verification failed` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      const organizationId = checkoutSession.client_reference_id;
      if (organizationId) {
        await db.organization.update({ where: { id: organizationId }, data: { planTier: "growth" } });
      }
      break;
    }
    case "customer.subscription.deleted": {
      // Look up your own mapping of subscription -> organization if you
      // store it; omitted here since it depends on how you persist
      // Stripe customer IDs on the Organization model.
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
