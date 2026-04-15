import { Page, expect } from "@playwright/test";

export function attachConsoleErrorListener(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));
  return errors;
}

export function attachNetworkFailureListener(page: Page): string[] {
  const failures: string[] = [];
  page.on("response", (response) => {
    if (
      response.status() >= 400 &&
      !response.url().includes("clerk") &&
      !response.url().includes("convex.cloud")
    ) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });
  return failures;
}

export async function assertStepIndicator(page: Page, stepNum: number) {
  await expect(page.getByText(`Step ${stepNum} of 9`)).toBeVisible();
}

export async function assertContinueEnabled(page: Page) {
  const btn = page.getByRole("button", { name: "Continue" });
  await expect(btn).toBeEnabled();
}

export async function assertContinueDisabled(page: Page) {
  const btn = page.getByRole("button", { name: "Continue" });
  await expect(btn).toBeDisabled();
}
