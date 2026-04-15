import { test, expect } from "@playwright/test";
import { clearWizardState, readWizardState, seedWizardState } from "../fixtures/localStorage";
import { seedAndNavigateTo } from "../utils/steps";
import {
  attachConsoleErrorListener,
  attachNetworkFailureListener,
  assertStepIndicator,
  assertContinueEnabled,
  assertContinueDisabled,
} from "../utils/assertions";
import { BASE_WIZARD_STATE } from "../fixtures/wizard-data";

const ONBOARDING_URL = "/onboarding/employer";

// ── Step 1: Qualification ─────────────────────────────────────────────────────

test.describe("Step 1 — Qualification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ONBOARDING_URL);
    await clearWizardState(page);
    await page.reload();
  });

  test("Continue disabled until all 4 questions answered", async ({ page }) => {
    await assertStepIndicator(page, 1);
    await assertContinueDisabled(page);

    await page.getByText("My own home").click();
    await page.getByText("No, this is my first time").click();
    await page.getByRole("button", { name: /Meals & cooking/i }).click();
    // 3 of 4 answered — still disabled
    await assertContinueDisabled(page);

    await page.getByText("Yes, they'll have the app").click();
    await assertContinueEnabled(page);
  });

  test("Selecting a focus chip toggles it; at least 1 required", async ({ page }) => {
    await page.getByText("My own home").click();
    await page.getByText("No, this is my first time").click();
    await page.getByText("Yes, they'll have the app").click();
    // No focus selected → disabled
    await assertContinueDisabled(page);
    // Select one
    await page.getByRole("button", { name: /Cleaning & chores/i }).click();
    await assertContinueEnabled(page);
    // Deselect it → disabled again
    await page.getByRole("button", { name: /Cleaning & chores/i }).click();
    await assertContinueDisabled(page);
  });

  test("Step 1 data is persisted to localStorage", async ({ page }) => {
    await page.getByText("My own home").click();
    await page.getByText("No, this is my first time").click();
    await page.getByRole("button", { name: /Meals & cooking/i }).click();
    await page.getByText("Yes, they'll have the app").click();

    const state = await readWizardState(page);
    expect(state?.setupFor).toBe("own");
    expect(state?.firstTimeEmployer).toBe(false);
    expect(state?.householdFocus).toContain("meals");
    expect(state?.helperHasPhone).toBe(true);
  });
});

// ── Step 2: Household ─────────────────────────────────────────────────────────

test.describe("Step 2 — Household", () => {
  test("Continue disabled with no rooms selected", async ({ page }) => {
    await seedAndNavigateTo(page, 2);
    await assertStepIndicator(page, 2);
    await assertContinueDisabled(page);

    await page.getByRole("button", { name: "Kitchen", exact: true }).click();
    await assertContinueEnabled(page);
  });

  test("Deep clean section appears when cleanliness is a focus and rooms are selected", async ({ page }) => {
    await seedAndNavigateTo(page, 2);
    await page.getByRole("button", { name: "Kitchen", exact: true }).click();
    await expect(page.getByText(/Periodic deep cleaning/i)).toBeVisible();
  });
});

// ── Step 3: Members ───────────────────────────────────────────────────────────

test.describe("Step 3 — Members", () => {
  test("Continue disabled with no members; enabled after adding one", async ({ page }) => {
    await seedAndNavigateTo(page, 3, { members: [] });
    await assertStepIndicator(page, 3);
    await assertContinueDisabled(page);

    await page.getByRole("button", { name: /Add Member/i }).click();
    await page.locator('input[placeholder="Name"]').first().fill("Alice");
    await assertContinueEnabled(page);
  });
});

// ── Step 4: Daily Life ────────────────────────────────────────────────────────

test.describe("Step 4 — Daily Life", () => {
  test("Continue always enabled (optional step)", async ({ page }) => {
    await seedAndNavigateTo(page, 4);
    await assertStepIndicator(page, 4);
    await assertContinueEnabled(page);
  });
});

// ── Step 5: Experience ────────────────────────────────────────────────────────

test.describe("Step 5 — Experience", () => {
  test("Continue disabled until experience selected", async ({ page }) => {
    await seedAndNavigateTo(page, 5, { helperExperience: null });
    await assertStepIndicator(page, 5);
    await assertContinueDisabled(page);

    await page.getByRole("button", { name: /Some experience/i }).click();
    await assertContinueEnabled(page);
  });
});

// ── Step 6: Helper Details ────────────────────────────────────────────────────

test.describe("Step 6 — Helper Details", () => {
  test("Invite code auto-generates on mount", async ({ page }) => {
    await seedAndNavigateTo(page, 6, { helperDetails: null, inviteCode: "", inviteQrData: "" });
    await assertStepIndicator(page, 6);

    // Fill helper name to satisfy canProceed
    await page.getByPlaceholder(/e\.g\. Maria Santos/i).fill("Maria");
    // Invite code should auto-generate — Continue becomes enabled
    await assertContinueEnabled(page);
  });

  test("No-app path: Continue works without QR shown", async ({ page }) => {
    await seedAndNavigateTo(page, 6, { helperHasPhone: false, helperDetails: null, inviteCode: "" });
    await assertStepIndicator(page, 6);
    await page.getByPlaceholder(/e\.g\. Maria Santos/i).fill("Maria");
    await assertContinueEnabled(page);
  });
});

// ── Step 7: AI Schedule Generation ───────────────────────────────────────────

test.describe("Step 7 — AI Schedule Generation", () => {
  test("Loading screen shows then success state appears (AI mock ≤30s)", async ({ page }) => {
    const networkFailures = attachNetworkFailureListener(page);
    await seedAndNavigateTo(page, 7);
    await assertStepIndicator(page, 7);

    // Loading state visible immediately
    await expect(
      page.getByText(/Building your schedule|Building.*week/i)
    ).toBeVisible({ timeout: 5_000 });

    // Success state after mock completes
    await expect(
      page.getByText(/week is ready|schedule is ready/i)
    ).toBeVisible({ timeout: 30_000 });

    // No AI network failure
    expect(networkFailures.filter((f) => f.includes("generate-timetable"))).toHaveLength(0);

    // weeklyTasks written to localStorage with correct shape
    const state = await readWizardState(page);
    expect(Array.isArray(state?.weeklyTasks)).toBe(true);
    expect(state.weeklyTasks[0]).toHaveProperty("day");
    expect(state.weeklyTasks[0]).toHaveProperty("tasks");
    expect(state.weeklyTasks[0].tasks[0]).toHaveProperty("taskName");
  });
});

// ── Step 8: Schedule Editor ───────────────────────────────────────────────────

test.describe("Step 8 — Schedule Editor", () => {
  test("Schedule editor renders with days and Finish Setup button", async ({ page }) => {
    await seedAndNavigateTo(page, 8);
    await assertStepIndicator(page, 8);

    // Should show day navigation
    await expect(page.getByText(/Mon|Monday/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /Finish Setup/i })
    ).toBeVisible({ timeout: 15_000 });
  });
});

// ── Step 9: Sign Up ───────────────────────────────────────────────────────────

test.describe("Step 9 — Sign Up", () => {
  test("All auth options visible and heading correct", async ({ page }) => {
    await seedAndNavigateTo(page, 9);
    await assertStepIndicator(page, 9);

    await expect(page.getByText("Your timetable is ready!")).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue with Apple/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue with Facebook/i })).toBeVisible();
  });

  test("Create Account disabled until valid email + 8-char password entered", async ({ page }) => {
    await seedAndNavigateTo(page, 9);

    const createBtn = page.getByRole("button", { name: /Create Account/i });
    await expect(createBtn).toBeDisabled();

    await page.getByPlaceholder("you@example.com").fill("test@example.com");
    await page.getByPlaceholder("Min 8 characters").fill("short");
    await expect(createBtn).toBeDisabled();

    await page.getByPlaceholder("Min 8 characters").fill("longenough123");
    await expect(createBtn).toBeEnabled();
  });
});
