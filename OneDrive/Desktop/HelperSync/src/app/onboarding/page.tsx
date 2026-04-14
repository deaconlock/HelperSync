"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function OnboardingPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const household = useQuery(api.households.getMyHousehold, isSignedIn ? undefined : "skip");
  const helperSession = useQuery(api.helperSessions.getMySession, isSignedIn ? undefined : "skip");

  useEffect(() => {
    // Already set up — send to the right place
    if (household) {
      router.replace("/dashboard");
      return;
    }
    if (helperSession) {
      router.replace("/helper");
      return;
    }
    // Resume an in-progress employer wizard after OAuth
    const wizardData = localStorage.getItem("helpersync-wizard");
    if (isSignedIn && wizardData) {
      router.replace("/onboarding/employer?completing=true");
      return;
    }
    // Default: start employer onboarding
    router.replace("/onboarding/employer");
  }, [household, helperSession, isSignedIn, router]);

  return null;
}
