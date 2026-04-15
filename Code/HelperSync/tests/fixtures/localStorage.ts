import { Page } from "@playwright/test";

export async function clearWizardState(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("helpersync-wizard");
    localStorage.removeItem("helpersync-wizard-step");
  });
}

export async function seedWizardState(
  page: Page,
  data: Record<string, unknown>,
  step: number
) {
  await page.evaluate(
    ({ data, step }) => {
      localStorage.setItem("helpersync-wizard", JSON.stringify(data));
      localStorage.setItem("helpersync-wizard-step", String(step));
    },
    { data, step }
  );
}

export async function readWizardState(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("helpersync-wizard");
    return raw ? JSON.parse(raw) : null;
  });
}
