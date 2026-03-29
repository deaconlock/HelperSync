import { NextRequest, NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  const { householdId } = (await request.json()) as {
    householdId: Id<"households">;
  };

  if (!householdId) {
    return NextResponse.json({ error: "householdId required" }, { status: 400 });
  }

  const polarAccessToken = process.env.POLAR_ACCESS_TOKEN;
  const productId = process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!polarAccessToken || !productId) {
    // Dev fallback: simulate checkout by marking payment collected
    if (process.env.AI_MOCK === "true" || process.env.NODE_ENV === "development") {
      await convex.mutation(api.subscriptions.markPaymentCollected, { householdId });
      return NextResponse.json({ url: `${appUrl}/checkout/success?mock=true` });
    }
    return NextResponse.json({ error: "Payment not configured" }, { status: 500 });
  }

  try {
    const polar = new Polar({ accessToken: polarAccessToken });

    const checkout = await polar.checkouts.create({
      productId,
      successUrl: `${appUrl}/checkout/success`,
      metadata: { householdId },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("Polar checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
