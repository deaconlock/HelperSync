# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: onboarding\employer.spec.ts >> Step 8 — Schedule Editor >> Schedule editor renders with days and Finish Setup button
- Location: tests\onboarding\employer.spec.ts:176:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /Finish Setup/i })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('button', { name: /Finish Setup/i })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - generic [ref=e6]:
            - img [ref=e7]
            - generic [ref=e13]: HelperSync
          - generic [ref=e14]:
            - paragraph [ref=e15]: Review Schedule
            - generic [ref=e16]: Step 8 of 9
        - generic [ref=e17]:
          - button "Go back to step 1" [ref=e18] [cursor=pointer]
          - button "Go back to step 2" [ref=e19] [cursor=pointer]
          - button "Go back to step 3" [ref=e20] [cursor=pointer]
          - button "Go back to step 4" [ref=e21] [cursor=pointer]
          - button "Go back to step 5" [ref=e22] [cursor=pointer]
          - button "Go back to step 6" [ref=e23] [cursor=pointer]
          - button "Go back to step 7" [ref=e24] [cursor=pointer]
    - main [ref=e27]:
      - generic [ref=e29]:
        - generic [ref=e30]:
          - generic [ref=e32]:
            - generic [ref=e33]:
              - generic [ref=e35]: 🧹
              - generic [ref=e36]:
                - heading "Monday" [level=3] [ref=e37]
                - button "Show help" [ref=e39] [cursor=pointer]:
                  - img [ref=e40]
              - paragraph [ref=e43]: Deep clean + laundry
            - generic [ref=e46]:
              - generic [ref=e48]:
                - paragraph [ref=e49]: Focus
                - paragraph [ref=e50]: Deep clean + laundry
              - generic [ref=e52]:
                - paragraph [ref=e53]: Notable tasks
                - generic [ref=e54]:
                  - generic [ref=e55]:
                    - generic [ref=e56]: 👔
                    - generic [ref=e57]:
                      - paragraph [ref=e58]: Fold & Iron Laundry
                      - paragraph [ref=e59]: 13:00
                  - generic [ref=e60]:
                    - generic [ref=e61]: 🛒
                    - generic [ref=e62]:
                      - paragraph [ref=e63]: Grocery Shopping
                      - paragraph [ref=e64]: 14:15
              - generic [ref=e66]:
                - generic [ref=e67]: 🍳 Meal Prep
                - generic [ref=e68]: 🧹 Household Chores
                - generic [ref=e69]: 🛍️ Errands
                - generic [ref=e70]: 13 tasks
          - button "Previous slide" [ref=e71] [cursor=pointer]
          - button "Next slide" [ref=e72] [cursor=pointer]
        - generic [ref=e73]:
          - button [ref=e74] [cursor=pointer]
          - button [ref=e75] [cursor=pointer]
          - button [ref=e76] [cursor=pointer]
          - button [ref=e77] [cursor=pointer]
          - button [ref=e78] [cursor=pointer]
          - button [ref=e79] [cursor=pointer]
          - button [ref=e80] [cursor=pointer]
          - button [ref=e81] [cursor=pointer]
        - paragraph [ref=e82]: Swipe to explore your schedule →
  - region "Notifications alt+T"
  - 'button "DEV: Reset" [ref=e84] [cursor=pointer]':
    - img [ref=e85]
    - text: "DEV: Reset"
  - button "Open Next.js Dev Tools" [ref=e93] [cursor=pointer]:
    - img [ref=e94]
  - alert [ref=e97]
```

# Test source

```ts
  84  | 
  85  | // ── Step 3: Members ───────────────────────────────────────────────────────────
  86  | 
  87  | test.describe("Step 3 — Members", () => {
  88  |   test("Continue disabled with no members; enabled after adding one", async ({ page }) => {
  89  |     await seedAndNavigateTo(page, 3, { members: [] });
  90  |     await assertStepIndicator(page, 3);
  91  |     await assertContinueDisabled(page);
  92  | 
  93  |     await page.getByRole("button", { name: /Add Member/i }).click();
  94  |     await page.locator('input[placeholder="Name"]').first().fill("Alice");
  95  |     await assertContinueEnabled(page);
  96  |   });
  97  | });
  98  | 
  99  | // ── Step 4: Daily Life ────────────────────────────────────────────────────────
  100 | 
  101 | test.describe("Step 4 — Daily Life", () => {
  102 |   test("Continue always enabled (optional step)", async ({ page }) => {
  103 |     await seedAndNavigateTo(page, 4);
  104 |     await assertStepIndicator(page, 4);
  105 |     await assertContinueEnabled(page);
  106 |   });
  107 | });
  108 | 
  109 | // ── Step 5: Experience ────────────────────────────────────────────────────────
  110 | 
  111 | test.describe("Step 5 — Experience", () => {
  112 |   test("Continue disabled until experience selected", async ({ page }) => {
  113 |     await seedAndNavigateTo(page, 5, { helperExperience: null });
  114 |     await assertStepIndicator(page, 5);
  115 |     await assertContinueDisabled(page);
  116 | 
  117 |     await page.getByRole("button", { name: /Some experience/i }).click();
  118 |     await assertContinueEnabled(page);
  119 |   });
  120 | });
  121 | 
  122 | // ── Step 6: Helper Details ────────────────────────────────────────────────────
  123 | 
  124 | test.describe("Step 6 — Helper Details", () => {
  125 |   test("Invite code auto-generates on mount", async ({ page }) => {
  126 |     await seedAndNavigateTo(page, 6, { helperDetails: null, inviteCode: "", inviteQrData: "" });
  127 |     await assertStepIndicator(page, 6);
  128 | 
  129 |     // Fill helper name to satisfy canProceed
  130 |     await page.getByPlaceholder(/e\.g\. Maria Santos/i).fill("Maria");
  131 |     // Invite code should auto-generate — Continue becomes enabled
  132 |     await assertContinueEnabled(page);
  133 |   });
  134 | 
  135 |   test("No-app path: Continue works without QR shown", async ({ page }) => {
  136 |     await seedAndNavigateTo(page, 6, { helperHasPhone: false, helperDetails: null, inviteCode: "" });
  137 |     await assertStepIndicator(page, 6);
  138 |     await page.getByPlaceholder(/e\.g\. Maria Santos/i).fill("Maria");
  139 |     await assertContinueEnabled(page);
  140 |   });
  141 | });
  142 | 
  143 | // ── Step 7: AI Schedule Generation ───────────────────────────────────────────
  144 | 
  145 | test.describe("Step 7 — AI Schedule Generation", () => {
  146 |   test("Loading screen shows then success state appears (AI mock ≤30s)", async ({ page }) => {
  147 |     const networkFailures = attachNetworkFailureListener(page);
  148 |     await seedAndNavigateTo(page, 7);
  149 |     await assertStepIndicator(page, 7);
  150 | 
  151 |     // Loading state visible immediately
  152 |     await expect(
  153 |       page.getByText(/Building your schedule|Building.*week/i)
  154 |     ).toBeVisible({ timeout: 5_000 });
  155 | 
  156 |     // Success state after mock completes
  157 |     await expect(
  158 |       page.getByText(/week is ready|schedule is ready/i)
  159 |     ).toBeVisible({ timeout: 30_000 });
  160 | 
  161 |     // No AI network failure
  162 |     expect(networkFailures.filter((f) => f.includes("generate-timetable"))).toHaveLength(0);
  163 | 
  164 |     // weeklyTasks written to localStorage with correct shape
  165 |     const state = await readWizardState(page);
  166 |     expect(Array.isArray(state?.weeklyTasks)).toBe(true);
  167 |     expect(state.weeklyTasks[0]).toHaveProperty("day");
  168 |     expect(state.weeklyTasks[0]).toHaveProperty("tasks");
  169 |     expect(state.weeklyTasks[0].tasks[0]).toHaveProperty("taskName");
  170 |   });
  171 | });
  172 | 
  173 | // ── Step 8: Schedule Editor ───────────────────────────────────────────────────
  174 | 
  175 | test.describe("Step 8 — Schedule Editor", () => {
  176 |   test("Schedule editor renders with days and Finish Setup button", async ({ page }) => {
  177 |     await seedAndNavigateTo(page, 8);
  178 |     await assertStepIndicator(page, 8);
  179 | 
  180 |     // Should show day navigation
  181 |     await expect(page.getByText(/Mon|Monday/i).first()).toBeVisible({ timeout: 10_000 });
  182 |     await expect(
  183 |       page.getByRole("button", { name: /Finish Setup/i })
> 184 |     ).toBeVisible({ timeout: 15_000 });
      |       ^ Error: expect(locator).toBeVisible() failed
  185 |   });
  186 | });
  187 | 
  188 | // ── Step 9: Sign Up ───────────────────────────────────────────────────────────
  189 | 
  190 | test.describe("Step 9 — Sign Up", () => {
  191 |   test("All auth options visible and heading correct", async ({ page }) => {
  192 |     await seedAndNavigateTo(page, 9);
  193 |     await assertStepIndicator(page, 9);
  194 | 
  195 |     await expect(page.getByText("Your timetable is ready!")).toBeVisible();
  196 |     await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
  197 |     await expect(page.getByRole("button", { name: /Continue with Apple/i })).toBeVisible();
  198 |     await expect(page.getByRole("button", { name: /Continue with Facebook/i })).toBeVisible();
  199 |   });
  200 | 
  201 |   test("Create Account disabled until valid email + 8-char password entered", async ({ page }) => {
  202 |     await seedAndNavigateTo(page, 9);
  203 | 
  204 |     const createBtn = page.getByRole("button", { name: /Create Account/i });
  205 |     await expect(createBtn).toBeDisabled();
  206 | 
  207 |     await page.getByPlaceholder("you@example.com").fill("test@example.com");
  208 |     await page.getByPlaceholder("Min 8 characters").fill("short");
  209 |     await expect(createBtn).toBeDisabled();
  210 | 
  211 |     await page.getByPlaceholder("Min 8 characters").fill("longenough123");
  212 |     await expect(createBtn).toBeEnabled();
  213 |   });
  214 | });
  215 | 
```