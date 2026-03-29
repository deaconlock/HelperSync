import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import crypto from "crypto";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("POLAR_WEBHOOK_SECRET not set — skipping signature verification");
    return true;
  }
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("webhook-signature") ?? "";

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const event = JSON.parse(body);
    const { type, data } = event;

    const householdId = data?.metadata?.householdId as Id<"households"> | undefined;

    if (!householdId) {
      return NextResponse.json({ received: true });
    }

    if (type === "subscription.created" || type === "subscription.updated") {
      await convex.mutation(api.subscriptions.upsertSubscription, {
        householdId,
        polarSubscriptionId: data.id,
        status: data.status === "active" ? "active" : data.status === "trialing" ? "trialing" : data.status === "canceled" ? "canceled" : "past_due",
        currentPeriodEnd: data.current_period_end
          ? new Date(data.current_period_end).getTime()
          : undefined,
      });
    } else if (type === "subscription.canceled") {
      await convex.mutation(api.subscriptions.upsertSubscription, {
        householdId,
        polarSubscriptionId: data.id,
        status: "canceled",
      });
    } else if (type === "checkout.completed") {
      // Card collected — mark payment as collected so the payment wall clears
      await convex.mutation(api.subscriptions.markPaymentCollected, {
        householdId,
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Polar webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
