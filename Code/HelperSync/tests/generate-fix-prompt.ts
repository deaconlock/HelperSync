/**
 * Run this after `npm run test:onboarding` fails.
 * It re-runs the tests in JSON mode, reads the failures, and prints a
 * ready-to-paste prompt you can give to Claude to get fixes.
 *
 * Usage:
 *   npx ts-node tests/generate-fix-prompt.ts
 *   node --experimental-strip-types tests/generate-fix-prompt.ts   (Node 22+)
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const RESULTS_FILE = path.join(process.cwd(), "playwright-results.json");

// ── 1. Run tests with JSON reporter ──────────────────────────────────────────
console.log("Running onboarding tests...\n");

let passed = false;
try {
  const output = execSync(
    "npx playwright test tests/onboarding/ --reporter=json",
    { encoding: "utf-8", stdio: ["inherit", "pipe", "pipe"] }
  );
  fs.writeFileSync(RESULTS_FILE, output, "utf-8");
  passed = true;
} catch (err: any) {
  // execSync throws on non-zero exit (i.e. test failures) — stdout still has JSON
  const output = err.stdout ?? "";
  if (output.trim()) {
    fs.writeFileSync(RESULTS_FILE, output, "utf-8");
  }
}

if (passed) {
  console.log("\nAll tests passed! Nothing to fix.");
  if (fs.existsSync(RESULTS_FILE)) fs.unlinkSync(RESULTS_FILE);
  process.exit(0);
}

// ── 2. Parse failures ─────────────────────────────────────────────────────────
if (!fs.existsSync(RESULTS_FILE)) {
  console.error("No results file found. Run the tests first.");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8"));

interface TestResult {
  title: string;
  errors: Array<{ message?: string; stack?: string }>;
  steps: Array<{ title: string; error?: { message: string } }>;
}

interface Suite {
  title: string;
  specs: Array<{ title: string; tests: TestResult[] }>;
  suites?: Suite[];
}

function collectFailures(suite: Suite, parentTitle = ""): string[] {
  const failures: string[] = [];
  const fullTitle = parentTitle ? `${parentTitle} > ${suite.title}` : suite.title;

  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      if (test.errors?.length) {
        const errorMsg = test.errors[0]?.message ?? test.errors[0]?.stack ?? "Unknown error";
        const failedStep = test.steps?.find((s) => s.error)?.title ?? "";
        failures.push(
          `TEST: ${fullTitle} > ${spec.title}\n` +
          `ERROR: ${errorMsg.split("\n").slice(0, 6).join("\n")}` +
          (failedStep ? `\nFAILED AT STEP: ${failedStep}` : "")
        );
      }
    }
  }

  for (const child of suite.suites ?? []) {
    failures.push(...collectFailures(child, fullTitle));
  }

  return failures;
}

const failures: string[] = [];
for (const suite of raw.suites ?? []) {
  failures.push(...collectFailures(suite));
}

if (failures.length === 0) {
  console.log("No failures found in results file.");
  fs.unlinkSync(RESULTS_FILE);
  process.exit(0);
}

// ── 3. Read relevant source files for context ─────────────────────────────────
function readFile(relPath: string): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), relPath), "utf-8");
  } catch {
    return "(file not found)";
  }
}

const employerPage = readFile("src/app/onboarding/employer/page.tsx");
const wizardShell  = readFile("src/components/onboarding/WizardShell.tsx");

// ── 4. Build the prompt ───────────────────────────────────────────────────────
const prompt = `
You are helping debug a Next.js onboarding wizard called HelperSync.
Playwright end-to-end tests just ran and found ${failures.length} failure(s).
Please diagnose each failure and tell me exactly what to change in the code to fix it.

════════════════════════════════════════════
FAILING TESTS (${failures.length})
════════════════════════════════════════════

${failures.map((f, i) => `[${i + 1}]\n${f}`).join("\n\n")}

════════════════════════════════════════════
RELEVANT SOURCE CODE
════════════════════════════════════════════

── src/app/onboarding/employer/page.tsx ──
${employerPage}

── src/components/onboarding/WizardShell.tsx ──
${wizardShell}

════════════════════════════════════════════
INSTRUCTIONS
════════════════════════════════════════════
For each failing test:
1. Explain in 1-2 sentences what is actually broken in the app (not just the test)
2. Show the exact code change needed to fix it (file path + before/after diff)
3. If the test selector is wrong (e.g. button text changed), tell me what to update in the test file instead

Be concise. Only fix the failures listed above.
`.trim();

// ── 5. Print and save ─────────────────────────────────────────────────────────
const outputFile = path.join(process.cwd(), "fix-prompt.txt");
fs.writeFileSync(outputFile, prompt, "utf-8");
fs.unlinkSync(RESULTS_FILE);

console.log("\n" + "═".repeat(60));
console.log(`${failures.length} test(s) failed.`);
console.log("═".repeat(60));
console.log("\nPrompt saved to: fix-prompt.txt");
console.log("Paste its contents into Claude to get fixes.\n");
console.log("Quick preview of failures:");
failures.forEach((f, i) => {
  const firstLine = f.split("\n")[0];
  console.log(`  [${i + 1}] ${firstLine}`);
});
