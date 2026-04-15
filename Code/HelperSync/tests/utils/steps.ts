import { Page, expect } from "@playwright/test";
import { seedWizardState } from "../fixtures/localStorage";
import { BASE_WIZARD_STATE, MOCK_WEEKLY_TASKS, STEP3_MEMBERS } from "../fixtures/wizard-data";

const ONBOARDING_URL = "/onboarding/employer";

// ── Step 1: Qualification ─────────────────────────────────────────────────────

export async function completeStep1(page: Page) {
  await page.getByText("My own home").click();
  await page.getByText("No, this is my first time").click();
  await page.getByRole("button", { name: /Meals & cooking/i }).click();
  await page.getByRole("button", { name: /Cleaning & chores/i }).click();
  await page.getByText("Yes, they'll have the app").click();
  await page.getByRole("button", { name: "Continue" }).click();
}

// ── PersonaCard interstitial ──────────────────────────────────────────────────

export async function dismissPersonaCard(page: Page) {
  // PersonaCard replaces WizardShell — wait for its Continue button
  await expect(page.getByText("Step 1 of 9")).not.toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: /Continue/i }).click();
}

// ── Step 2: Household ─────────────────────────────────────────────────────────

export async function completeStep2(page: Page) {
  await page.getByPlaceholder(/e\.g\. The Smith Family Home/i).fill("The Test Family Home");
  // Toggle room chips
  for (const room of ["Master Bedroom", "Kitchen", "Living Room", "Bathroom"]) {
    await page.getByRole("button", { name: room, exact: true }).click();
  }
  await page.getByRole("button", { name: "Continue" }).click();
}

// ── Step 3: Members ───────────────────────────────────────────────────────────

export async function completeStep3(page: Page) {
  // First member row may already be rendered empty; fill it
  const nameInputs = page.locator('input[placeholder="Name"]');
  await nameInputs.first().fill(STEP3_MEMBERS[0].name);
  await page.locator("select").first().selectOption(STEP3_MEMBERS[0].role);

  // Add second member
  await page.getByRole("button", { name: /Add Member/i }).click();
  await nameInputs.nth(1).fill(STEP3_MEMBERS[1].name);
  await page.locator("select").nth(1).selectOption(STEP3_MEMBERS[1].role);

  await page.getByRole("button", { name: "Continue" }).click();
}

// ── Step 4: Daily Life (optional — no routines entered) ───────────────────────

export async function completeStep4(page: Page) {
  // No routines → goToStep(4.5) directly
  await page.getByRole("button", { name: "Continue" }).click();
}

// ── Step 5: Experience ────────────────────────────────────────────────────────

export async function completeStep5(page: Page) {
  await page.getByRole("button", { name: /Some experience/i }).click();
  await page.getByRole("button", { name: "Continue" }).click();
}

// ── Step 6: Helper Details ────────────────────────────────────────────────────

export async function completeStep6(page: Page) {
  await page.getByPlaceholder(/e\.g\. Maria Santos/i).fill("Maria Santos");
  // Wait for invite code to auto-generate
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Continue" }).click();
}

// ── Step 7: AI Schedule Generation ───────────────────────────────────────────

export async function waitForStep7Generated(page: Page) {
  // Loading state fires immediately, success state appears after mock (~12s)
  await expect(
    page.getByText(/week is ready|schedule is ready/i)
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Continue" }).click();
}

// ── Step 8: Schedule Editor ───────────────────────────────────────────────────

export async function completeStep8(page: Page) {
  // Wait for the editor phase to render and show the Finish Setup button
  await expect(
    page.getByRole("button", { name: /Finish Setup/i })
  ).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Finish Setup/i }).click();
}

// ── Seed & navigate to a specific step ───────────────────────────────────────
// Bypasses clicking through previous steps for isolated per-step tests.

export async function seedAndNavigateTo(
  page: Page,
  step: number,
  overrides: Record<string, unknown> = {}
) {
  const state = {
    ...BASE_WIZARD_STATE,
    weeklyTasks: step >= 8 ? MOCK_WEEKLY_TASKS : null,
    ...overrides,
  };

  await page.goto(ONBOARDING_URL);
  await seedWizardState(page, state, step);
  await page.reload();
}
