"use client";

import { useCallback } from "react";
import { usePostHog } from "posthog-js/react";

// ── Event catalogue ──────────────────────────────────────────────────────────

export type AnalyticsEvent =
  // Onboarding funnel
  | { event: "onboarding_step_viewed";     props: { step: number; stepName: string } }
  | { event: "onboarding_step_completed";  props: { step: number; stepName: string; timeOnStepSeconds: number } }
  | { event: "onboarding_persona_shown";   props: { persona: string } }
  | { event: "onboarding_completed";       props: { totalTimeSeconds: number; persona: string } }
  // Auth
  | { event: "signup_completed";           props: { method: "google" | "email" } }
  // Dashboard
  | { event: "dashboard_visited";          props: Record<string, never> }
  | { event: "timetable_opened";           props: Record<string, never> }
  // Helper view
  | { event: "helper_view_visited";        props: Record<string, never> }
  // Tasks
  | { event: "task_completed";             props: { category: string; area: string } }
  | { event: "task_uncompleted";           props: { category: string; area: string } }
  // One-off task
  | { event: "one_off_task_added";         props: Record<string, never> }
  // Days off
  | { event: "day_off_added";              props: Record<string, never> };

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Thin wrapper around PostHog. Safe to call even when PostHog is not
 * initialised (no key configured) — events are silently dropped.
 */
export function useAnalytics() {
  const ph = usePostHog();

  const track = useCallback(
    <E extends AnalyticsEvent["event"]>(
      event: E,
      props: Extract<AnalyticsEvent, { event: E }>["props"]
    ) => {
      if (!ph) return;
      ph.capture(event, props);
    },
    [ph]
  );

  return { track };
}
