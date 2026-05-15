"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  // After OAuth completes, decide where to send the user.
  // Helper-join intent (set by /join before sign-in) always wins over a
  // stale employer-wizard resume — otherwise leftover localStorage from
  // earlier testing can hijack a helper into the employer wizard.
  useEffect(() => {
    if (!isSignedIn) return;

    const pendingJoin = sessionStorage.getItem("helpersync-pending-join");
    if (pendingJoin) {
      sessionStorage.removeItem("helpersync-pending-join");
      router.replace(`/join?code=${pendingJoin}`);
      return;
    }

    const wizardData = localStorage.getItem("helpersync-wizard");
    if (wizardData) {
      router.replace("/onboarding/employer?completing=true");
    }
  }, [isSignedIn, router]);

  return (
    <>
      <AuthenticateWithRedirectCallback />
      <div id="clerk-captcha" className="flex justify-center" />
    </>
  );
}
