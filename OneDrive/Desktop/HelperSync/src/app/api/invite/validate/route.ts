import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code || code.length !== 6) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const household = await convex.query(api.households.getHouseholdByInviteCode, {
    inviteCode: code.toUpperCase(),
  });

  if (!household) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    householdId: household._id,
    homeName: household.homeName,
    helperLanguage: household.helperDetails?.language ?? "en",
  });
}
