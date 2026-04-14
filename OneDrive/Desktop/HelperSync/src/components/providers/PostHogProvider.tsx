"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

// Initialise once on first render
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false, // we fire manually via usePathname
    capture_pageleave: true,
  });
}

/** Identifies the signed-in Clerk user with PostHog once auth is ready. */
function ClerkIdentifier() {
  const { userId } = useAuth();
  const ph = usePostHog();

  useEffect(() => {
    if (!ph) return;
    if (userId) {
      ph.identify(userId);
    } else {
      ph.reset();
    }
  }, [userId, ph]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // If no key configured (local dev without PostHog), skip wrapping
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <ClerkIdentifier />
      {children}
    </PHProvider>
  );
}
