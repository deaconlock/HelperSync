/**
 * Full end-to-end walkthrough of the employer onboarding wizard.
 * Walks Steps 1–9 entry without any shortcuts — the best test for catching
 * cross-step navigation bugs, broken transitions, and console errors.
 *
 * Stops at Step 9 (sign-up form visible) without submitting — no real Clerk
 * account is created.
 */

import { test, expect } from "@playwright/test";
import { clearWizardState } from "../fixtures/localStorage";
import {
  completeStep1,
  dismissPersonaCard,
  completeStep2,
  completeStep3,
  completeStep4,
  completeStep5,
  completeStep6,
  waitForStep7Generated,
  completeStep8,
} from "../utils/steps";
import {
  attachConsoleErrorListener,
  attachNetworkFailureListener,
  assertStepIndicator,
} from "../utils/assertions";

test("Full employer onboarding walkthrough — Steps 1 through 9 entry", async ({ page }) => {
  const consoleErrors = attachConsoleErrorListener(page);
  const networkFailures = attachNetworkFailureListener(page);

  await page.goto("/onboarding/employer");
  await clearWizardState(page);
  await page.reload();

  // ── Step 1: Qualification ──────────────────────────────────────────────────
  await assertStepIndicator(page, 1);
  await completeStep1(page);

  // ── PersonaCard ────────────────────────────────────────────────────────────
  await dismissPersonaCard(page);

  // ── Step 2: Household ──────────────────────────────────────────────────────
  await assertStepIndicator(page, 2);
  await completeStep2(page);

  // ── Step 3: Members ────────────────────────────────────────────────────────
  await assertStepIndicator(page, 3);
  await completeStep3(page);

  // ── Step 4: Daily Life ─────────────────────────────────────────────────────
  await assertStepIndicator(page, 4);
  await completeStep4(page);

  // ── Step 4.5: Service Prefs ────────────────────────────────────────────────
  // No step indicator assertion here (step === 4.5 renders "Step 4.5 of 9")
  await page.getByRole("button", { name: "Continue" }).click();

  // ── Step 5: Experience ─────────────────────────────────────────────────────
  await assertStepIndicator(page, 5);
  await completeStep5(page);

  // ── Step 6: Helper Details ─────────────────────────────────────────────────
  await assertStepIndicator(page, 6);
  await completeStep6(page);

  // ── Step 7: AI Schedule Generation ────────────────────────────────────────
  await assertStepIndicator(page, 7);
  await waitForStep7Generated(page);

  // ── Step 8: Schedule Editor ────────────────────────────────────────────────
  await assertStepIndicator(page, 8);
  await expect(page.getByText(/Mon|Monday/i).first()).toBeVisible({ timeout: 10_000 });
  await completeStep8(page);

  // ── Step 9: Sign Up ────────────────────────────────────────────────────────
  await assertStepIndicator(page, 9);
  await expect(page.getByText("Your timetable is ready!")).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();

  // ── Final checks ───────────────────────────────────────────────────────────
  const relevantNetworkFailures = networkFailures.filter(
    (f) => !f.includes("clerk") && !f.includes("convex.cloud")
  );
  expect(
    relevantNetworkFailures,
    `Network failures:\n${relevantNetworkFailures.join("\n")}`
  ).toHaveLength(0);

  const relevantConsoleErrors = consoleErrors.filter(
    (e) =>
      !e.includes("ResizeObserver") &&
      !e.includes("convex") &&
      !e.includes("clerk")
  );
  expect(
    relevantConsoleErrors,
    `Console errors:\n${relevantConsoleErrors.join("\n")}`
  ).toHaveLength(0);
});
