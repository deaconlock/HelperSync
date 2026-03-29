"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  // If the user was in the middle of employer onboarding (wizard data in localStorage),
  // redirect back to the employer wizard to complete setup
  useEffect(() => {
    if (!isSignedIn) return;

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
