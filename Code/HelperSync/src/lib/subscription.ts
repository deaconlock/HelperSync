export type TrialPhase =
  | "early"        // Days 1-6: full access, dismissible banner
  | "payment-wall" // Days 7-14: no payment collected yet, show modal
  | "grace"        // Days 7-14: payment collected, waiting for billing
  | "expired"      // Day 14+: no payment, hard lock
  | "active"       // Polar subscription active
  | "canceled";    // Subscription canceled

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 14;
const PAYMENT_WALL_DAYS_REMAINING = 7; // Show payment wall when 7 or fewer days remain

interface Subscription {
  status: "trialing" | "active" | "canceled" | "past_due";
  trialEndsAt: number;
  paymentCollectedAt?: number;
}

export function getTrialPhase(subscription: Subscription | null | undefined): TrialPhase | "loading" {
  if (subscription === undefined) return "loading"; // still loading from Convex
  if (subscription === null) return "expired"; // no subscription exists

  if (subscription.status === "active") return "active";
  if (subscription.status === "canceled") return "canceled";

  // trialing or past_due
  const now = Date.now();
  const daysRemaining = Math.ceil((subscription.trialEndsAt - now) / MS_PER_DAY);

  if (daysRemaining <= 0) {
    // Trial is over
    return subscription.paymentCollectedAt ? "active" : "expired";
  }

  // More than 7 days left → early trial, no payment nag
  if (daysRemaining > PAYMENT_WALL_DAYS_REMAINING) {
    return "early";
  }

  // 7 or fewer days left → payment wall or grace
  return subscription.paymentCollectedAt ? "grace" : "payment-wall";
}

export function getDaysInTrial(subscription: Subscription): number {
  const daysRemaining = Math.ceil((subscription.trialEndsAt - Date.now()) / MS_PER_DAY);
  return Math.max(1, TRIAL_DAYS - daysRemaining + 1);
}

export function getDaysRemaining(subscription: Subscription): number {
  return Math.max(0, Math.ceil((subscription.trialEndsAt - Date.now()) / MS_PER_DAY));
}
