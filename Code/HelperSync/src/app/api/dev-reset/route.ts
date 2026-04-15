import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  try {
    const { userId } = await auth();
    if (userId) {
      const client = await clerkClient();
      await client.users.deleteUser(userId);
    }
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("Dev reset - Clerk delete error:", err);
    return NextResponse.json({ deleted: false, error: "Failed to delete user" });
  }
}
