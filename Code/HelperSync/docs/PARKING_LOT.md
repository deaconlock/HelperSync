# HelperSync Parking Lot

Use this as your running backlog of ideas to explore. Each idea includes enough detail to implement without re-remembering context.

## How to use
- Keep `Status` as `backlog` until you’re ready to implement.
- Update `Priority` after you validate effort/complexity.
- When you start implementing an item, move `Status` to `in_progress` and link it to your issue/PR later.

## Priority bands
- **Quick Wins**: low/medium effort, high clarity/UX impact
- **Medium Bets**: moderate effort, compounding user value
- **Big Bets**: larger initiative, potentially architectural or cross-cutting

## Backlog (ideas)

### Quick Wins

1. **Clickable app icon/logo navigates to Home**
   - Source: you
   - Problem: icon is not clickable; users expect it to act like a home/landing shortcut
   - Goal: provide a reliable “return home” navigation pattern
   - Acceptance criteria:
     - Works on main authenticated pages
     - Clicking logo navigates to Home/Dashboard
     - Correct active state + consistent routing
     - Desktop + responsive mobile behavior
   - Priority: High / Effort Low
   - Status: done
   - Added: 2026-03-29

2. **Fix household description field UX (default text shouldn’t be a value)**
   - Source: Muz
   - Problem: users must manually delete existing prompt text before typing
   - Goal: make default text a placeholder-like experience, not prefilled content
   - Priority: High / Effort Low-Medium
   - Status: done — homeDescription field was removed from the UI entirely; emit always passes “”; no longer reproducible
   - Added: 2026-03-29

3. **Fix age leading-zero bug (`74` showing as `074`)**
   - Source: Muz
   - Problem: age input can’t remove forced leading `0`
   - Goal: store/display a canonical age (e.g., `74`, not `074`)
   - Acceptance criteria:
     - Input accepts realistic numeric values without forced leading zeros
     - Normalize on input/change/submit (and keep create+edit+review consistent)
     - Validate against allowed age range (use existing product rule if one already exists; otherwise consider 0–120)
     - Handle pasted/typed values like `0074` and whitespace
   - Priority: High / Effort Medium
   - Status: done — age field was replaced with a select dropdown (AGE_RANGES); number input no longer exists
   - Added: 2026-03-29

4. **Add contextual “More information” icons (especially timetable summary/review)**
   - Source: Muz
   - Problem: selected fields lack clear explanation at the moment users need it
   - Goal: improve comprehension and completion confidence with inline help
   - Acceptance criteria:
     - Add “More info” affordance on selected complex fields + timetable summary/review page
     - Uses existing UI pattern/components if available
     - Keyboard accessible and screen-reader friendly
     - Responsive layout without breaking form usability
   - Priority: Medium-High / Effort Medium
   - Status: done — `InfoTooltip` component built (`src/components/ui/InfoTooltip.tsx`); added to home size label in Step1Household and to each service preference section header in Step4bServicePrefs
   - Added: 2026-03-29

5. **Registration password show/hide toggle (eye icon)**
   - Source: you (via user feedback)
   - Priority: High / Effort Low-Medium
   - Status: done — Eye/EyeOff toggle already implemented in StepSignUp.tsx (lines 279–286)
   - Added: 2026-03-29

6. **Timetable generation speed improvement (currently > 60s reported)**
   - Source: you (via user feedback)
   - Problem: timetable generation takes over a minute, causing frustration and trust loss
   - Goal: reduce generation latency + improve progress/timeout experience
   - Acceptance criteria:
     - Target performance goal established (e.g., P50 < 10s, P95 < 25s)
     - Clear loading/progress UI during generation
     - Timeout + graceful retry/failure handling
     - Timing/log instrumentation to locate bottlenecks
   - Priority: High / Effort Medium-High
   - Status: backlog
   - Added: 2026-03-29

7. **Strengthen summary page confidence (make helper tasks explicit)**
   - Source: you (via user feedback)
   - Problem: summary page is too generic; doesn’t instill confidence about what helper will do
   - Goal: reduce uncertainty by clearly stating scope, priorities, and expectations
   - Acceptance criteria:
     - “What the helper will do” is explicit and plain-language
     - Include “what’s not included” / assumptions
     - Optional: show estimated time blocks + priority ordering
     - Add confidence-building microcopy (“Your helper receives this exact plan” style)
   - Priority: Medium-High / Effort Medium
   - Status: done — added "What your helper will do" bullet list, "Not included" assumptions section, and "Your helper receives this exact plan" confidence badge to Step8Review success state
   - Added: 2026-03-29

8. **Revise Spotify-style summary metrics for interpretability**
   - Source: you (via user feedback, building on earlier feedback)
   - Problem: large headline numbers (e.g., “27 tasks”) don’t explain what they mean or whether it’s too much/too little
   - Goal: provide context/benchmarks and actionable interpretation
   - Acceptance criteria:
     - Each headline metric includes a plain-English meaning
     - Provide context bands (typical vs high workload) where possible
     - Normalize where relevant (e.g., by days/persons)
     - Include “why it matters” + recommended next action
     - Remove ambiguous “vanity” metric usage
   - Priority: Medium-High / Effort Medium
   - Status: backlog
   - Added: 2026-03-29

### Medium Bets

9. **First-run onboarding education (bridging understanding after opening app)**
   - Source: you
   - Problem: app initial landing doesn’t educate new customers on what it does
   - Goal: quick educational onboarding via slides/infographics + guided first steps
   - Acceptance criteria:
     - 3–5 cards or slide flow: what it is, how it helps, what to do first
     - Include skip option and/or checklist completion state
     - Provide a clear “Start here” next action
   - Priority: Medium-High / Effort Medium
   - Status: done — 5-slide `FirstRunModal` in dashboard, shown once (localStorage flag), skip button, animated dot nav, dismiss on last slide CTA
   - Added: 2026-03-29

10. **Empty-state education + “Start here” guidance**
   - Source: you (suggested in onboarding discussion)
   - Problem: blank states aren’t informative
   - Goal: use examples to teach what to do next
   - Acceptance criteria:
     - When there is no data, show example content + next step CTA
     - Keep copy short and non-technical
   - Priority: Medium / Effort Low-Medium
   - Status: backlog
   - Added: 2026-03-29

11. **Interactive product tour / onboarding checklist**
   - Source: you (suggested in onboarding discussion)
   - Problem: users may not discover core UI actions
   - Goal: guide users to key actions with minimal reading
   - Acceptance criteria:
     - Highlight key screens/actions on first session
     - Provide a completion indicator + “resume later”
   - Priority: Medium / Effort Medium
   - Status: backlog
   - Added: 2026-03-29

12. **Embedded product analytics for PM decision-making**
   - Source: you
   - Problem: hard to analyze performance without integrated instrumentation
   - Goal: event tracking + PM dashboard for funnels, retention, and feature usage
   - Acceptance criteria:
     - Core events (signup, onboarding completion, activation/first key action, return usage)
     - Funnels (visit → signup → onboarding → activation)
     - Retention cohorts (D1/D7/D30)
     - Feature usage analytics by screen/action
     - Error/crash monitoring + performance metrics
     - Segmentation + date filters + exportable views
   - Priority: Medium-High / Effort High
   - Status: done — PostHog installed; `PostHogProvider` in root layout with Clerk identity wiring; `useAnalytics` hook with typed event catalogue; funnel events firing across onboarding wizard, dashboard, timetable, and helper view
   - Added: 2026-03-29

### Big Bets

13. **Demo / sample mode**
   - Source: you (suggested in onboarding discussion)
   - Problem: new users don’t have context/data to understand value
   - Goal: let users explore with safe fake data before committing
   - Acceptance criteria:
     - “Try it” flow uses demo content
     - Clear transition to real onboarding/setup
     - No accidental leakage of demo to production records
   - Priority: Low-Medium / Effort High
   - Status: backlog
   - Added: 2026-03-29

14. **Explainer media layer (short video/GIF onboarding/help)**
   - Source: you (suggested in onboarding discussion)
   - Problem: textual education may be insufficient
   - Goal: embed short media walkthroughs
   - Acceptance criteria:
     - Keep media short (seconds-level)
     - Include captions + accessibility fallback
     - Not blocking the primary flow (skippable)
   - Priority: Medium / Effort Medium
   - Status: backlog
   - Added: 2026-03-29

---

*Items 27–29 added from role-selection UX discussion — 2026-03-30*

### Quick Wins

27. **Reframe role-selection copy to goal-oriented language**
   - Source: you
   - Problem: "I'm an Employer / I'm a Helper" is inside-out (product-centric). Users think in terms of their situation, not a role label. "Employer" also carries a formal HR connotation that doesn't match how families think about themselves
   - Goal: replace role labels with user-goal framing so the choice is instantly obvious
   - Acceptance criteria:
     - Employer option reworded to something like "I manage a household with hired help"
     - Helper option reworded to "I've been invited to join a household"
     - Helper option subtly implies what comes next (code entry), setting correct expectation
     - No change to underlying routing logic — copy change only
     - Both options tested with at least one non-technical reader before shipping
   - Priority: High / Effort Low
   - Status: backlog
   - Added: 2026-03-30

### Medium Bets

28. **Employer qualifying questions + adaptive onboarding routing**
   - Source: you
   - Problem: employers aren't homogeneous. A first-time employer needs hand-holding; an experienced one wants speed. A care-heavy household (elderly/baby) has different priorities than a chores-only one. A household where the helper won't use a phone needs a completely different feature set. Routing everyone through the same 8-step wizard ignores this
   - Goal: ask 2–3 high-signal questions after role selection to personalise the onboarding path and set accurate expectations
   - Key qualifying dimensions:
     - **Experience**: "Is this your first time managing household help?" → more guidance vs. faster path
     - **Household type**: "What matters most?" (childcare / elder care / chores / all of the above) → pre-prioritise task categories
     - **Helper phone access**: "Will your helper use HelperSync on their phone?" (Yes / No — I'll manage it for them) → determines which features are surfaced and whether printable checklist mode is enabled (see item 29)
   - Acceptance criteria:
     - Questions feel conversational, not like a form — one question per screen or presented as cards
     - Answers stored in household profile and used to: (a) pre-fill defaults in timetable setup, (b) show/hide helper-app-related UI, (c) adjust onboarding copy and tips
     - User can change answers later in household settings
     - Non-blocking — all paths still reach the full wizard; this shapes defaults, not gates features
     - "No phone" answer activates printable checklist mode (item 29) and suppresses helper invite prompts
   - Priority: Medium-High / Effort Medium-High
   - Status: backlog
   - Added: 2026-03-30

### Big Bets

29. **Printable weekly checklist for helpers without phone access**
   - Source: you
   - Problem: a meaningful segment of employers (especially in SG/expat market) don't give their helper a phone or don't want to manage a second device. Currently, these households get no value from the helper-facing side of the app — large portions of the product are invisible to them
   - Goal: make HelperSync fully valuable for "employer-only" households by generating a physical-world artefact from the digital schedule
   - How it works: the weekly timetable the employer builds in HelperSync auto-generates a clean, printable A4 checklist. The helper works from paper; the employer can optionally log completion themselves
   - Acceptance criteria:
     - Triggered when household is in "no helper phone" mode (set during onboarding, item 28, or in settings)
     - Weekly checklist auto-generated every Monday (or on demand) from the active timetable
     - Print layout: one page per day or full week on A4, task rows with checkbox, time, area, and notes columns
     - Exportable as PDF from dashboard
     - Optional: QR code on printout links employer to mark tasks complete from their own phone
     - Checklist regenerates automatically when timetable template changes
     - Print stylesheet ensures no UI chrome appears on paper
   - Priority: Medium / Effort High
   - Status: backlog
   - Added: 2026-03-30

---

*Items 32–37 added from YouTube onboarding best practices review — 2026-04-14*

### Quick Wins

32. **Add social proof line to PersonaCard**
   - Source: YouTube onboarding best practices
   - Priority: High / Effort Very Low
   - Status: done — "Join 2,400+ families..." line added to PersonaCard.tsx below tagline
   - Added: 2026-04-14

33. **Add priming questions to Step 1 (qualification)**
   - Source: YouTube onboarding best practices
   - Priority: High / Effort Low
   - Status: done — Q4 (miscommunication frequency) and Q5 (time re-explaining) added as optional chip questions in Step0Qualification.tsx; stored as miscommunicationFrequency and timeReexplainingTasks in WizardData
   - Added: 2026-04-14

34. **Add welcome/value screen before Step 1**
   - Source: YouTube onboarding best practices
   - Problem: onboarding jumps straight into questions — users haven't been told what they're about to get, so they have no motivation to complete the flow
   - Goal: a zero-interaction screen that sets expectations and builds excitement before the survey begins
   - Acceptance criteria:
     - Single screen with headline, 3 value bullets (e.g. "AI-generated weekly schedule", "Helper task tracking", "Managed daily routines"), and a "Get started" CTA
     - No form fields — purely informational
     - Does not count as a wizard step (no step indicator)
   - Priority: Medium-High / Effort Low
   - Status: done — `WelcomeScreen` component shown before Step 1 for fresh sessions; skipped for returning users who have a saved step in localStorage
   - Added: 2026-04-14

35. **Move email capture earlier in the flow**
   - Source: YouTube onboarding best practices
   - Problem: sign-up is Step 9 (the very last step) — users who drop off during AI generation or schedule editing are lost with no way to re-engage them
   - Goal: capture email right after Step 1 so drop-offs can be re-engaged via email
   - Acceptance criteria:
     - Lightweight email-only capture after Step 1 (frame as "Save your progress")
     - Full account creation (password/OAuth) stays at Step 9
     - Captured email pre-fills the sign-up form at Step 9
     - If user already has a Clerk account, skip this screen
   - Priority: High / Effort Medium
   - Status: backlog
   - Added: 2026-04-14

36. **Add paywall screen before sign-up**
   - Source: YouTube onboarding best practices
   - Problem: the generated schedule is the product's strongest value moment, but there's no conversion screen after it — users get everything for free with no prompt to subscribe
   - Goal: add a paywall/trial screen between Step 8 (schedule editor) and Step 9 (sign-up) to capitalise on peak motivation
   - Acceptance criteria:
     - Screen appears after schedule is reviewed, before account creation
     - Shows pricing tiers with a "Start 7-day free trial" CTA
     - Connects to existing Stripe/Polar checkout flow
     - Skip/free tier path available if applicable to your pricing model
   - Priority: High / Effort Medium
   - Status: backlog
   - Added: 2026-04-14

37. **Add per-step analytics tracking to onboarding**
   - Source: YouTube onboarding best practices (Mixpanel reference)
   - Problem: no visibility into where users drop off — impossible to know which steps are causing abandonment or how to prioritise improvements
   - Goal: track onboarding step views and completions so drop-off points are visible
   - Acceptance criteria:
     - `track("onboarding_step_viewed", { step })` call added inside `goToStep()` in `src/app/onboarding/employer/page.tsx`
     - Track completion event on `handleComplete()`
     - Integrate with PostHog or Mixpanel (free tier sufficient to start)
     - Funnel view available showing step-by-step drop-off rates
   - Priority: High / Effort Low-Medium
   - Status: backlog
   - Added: 2026-04-14

---

*Items 15–26 added from UI/UX design critique — 2026-03-30*

### Quick Wins

15. **Fix `text-[10px]` — raise minimum text size to 12px**
   - Source: UI/UX audit
   - Problem: `text-[10px]` in category badges, timetable day headers, and task metadata fails WCAG AA. Real risk for older users and elder care households
   - Goal: ensure all visible text meets accessibility minimum
   - Acceptance criteria:
     - Replace all `text-[10px]` instances with `text-xs font-medium`
     - No visual regression in badge/chip compactness (adjust padding if needed)
     - Verify in both light and dark mode
   - Priority: High / Effort Low
   - Status: done — all 22 instances of text-[10px] replaced with text-xs across src/
   - Added: 2026-03-30

16. **Add `sr-only` label to dark mode toggle**
   - Source: UI/UX audit
   - Problem: dark mode toggle is icon-only with no accessible label — screen readers can't describe it
   - Goal: screen-reader accessible toggle
   - Acceptance criteria:
     - Add `sr-only` span with "Toggle dark mode" (or equivalent) inside the button
     - Dynamically reflects current state: "Switch to dark mode" / "Switch to light mode"
   - Priority: High / Effort Low
   - Status: done — aria-label and sr-only span added to dark mode toggle in TopNav.tsx
   - Added: 2026-03-30

17. **Hide Back button on onboarding step 1 instead of disabling it**
   - Source: UI/UX audit
   - Priority: Medium / Effort Low
   - Status: done — WizardShell already uses `{step > 1 && <BackButton />}`, hidden not disabled
   - Added: 2026-03-30

18. **Remove decorative timeline bar from pending task cards**
   - Source: UI/UX audit
   - Priority: Medium / Effort Low
   - Status: done — no left accent bar found in TaskCard, SwipeableTaskItem, or DayTimelineView; already removed
   - Added: 2026-03-30

19. **Remove unused Nunito font import**
   - Source: UI/UX audit
   - Priority: Low / Effort Low
   - Status: n/a — Nunito is intentionally used as `font-helper` in `src/app/helper/layout.tsx`, applied to the entire helper view for role differentiation
   - Added: 2026-03-30

20. **Add category color legend to timetable**
   - Source: UI/UX audit
   - Priority: Medium / Effort Low
   - Status: done — color legend strip added below header in timetable/page.tsx using CATEGORY_COLORS + CATEGORY_EMOJIS
   - Added: 2026-03-30

21. **Pin "Add one-off task" to Live View header**
   - Source: UI/UX audit
   - Priority: Medium / Effort Low
   - Status: done — + button pinned to day column header in LiveDayColumn.tsx; bottom button kept as secondary
   - Added: 2026-03-30

### Medium Bets

22. **Unify helper view UI with employer dashboard**
   - Source: UI/UX audit
   - Problem: `src/app/helper/` uses different card padding, spacing rhythm, and task card structure to `src/app/dashboard/` — they don't feel like the same product
   - Goal: visual coherence across both user roles
   - Acceptance criteria:
     - Helper view card padding matches dashboard card spec (`p-5 sm:p-6`, `rounded-2xl`, `shadow-card`)
     - Font weights and heading hierarchy aligned
     - Task card structure (emoji → name → metadata) consistent between views
     - Dark mode parity
   - Priority: High / Effort Medium
   - Status: done — progress card updated to `shadow-card p-5 sm:p-6`; TaskCard already used shadow-card; EmergencyInfoCard/MedicationCard use semantic borders (intentional)
   - Added: 2026-03-30

23. **Replace "3 of 9" with named onboarding step indicator**
   - Source: UI/UX audit
   - Problem: numeric step counter ("3 of 9") gives users no sense of what's coming — a leading cause of onboarding abandonment
   - Goal: reduce drop-off by making progress legible
   - Acceptance criteria:
     - Step indicator shows current step name (e.g., "Your Household", "Members", "Priorities", "Schedule", "Review")
     - Current step highlighted; completed steps visually distinguished
     - Fits in sticky wizard header without overflowing on mobile
     - Numeric fallback acceptable on very small screens
   - Priority: High / Effort Medium
   - Status: backlog
   - Added: 2026-03-30

24. **Centralise category colors into a single constants file**
   - Source: UI/UX audit
   - Problem: `CATEGORY_COLORS` is defined in at least 3 places (`timetable/types.ts`, `TaskChip.tsx`, component-level overrides) — color drift is already happening
   - Goal: single source of truth for all category→color mappings
   - Acceptance criteria:
     - Create `src/constants/categories.ts` with canonical `CATEGORY_COLORS` map
     - All components import from this single file
     - No inline color overrides remain for standard categories
     - Timetable legend (item 20) also draws from this file
   - Priority: Medium / Effort Medium
   - Status: backlog
   - Added: 2026-03-30

25. **Replace orange-500 on Helper role card with a cohesive secondary color**
   - Source: UI/UX audit
   - Problem: orange-500 on the Helper role card has no system-level justification and makes the palette feel inconsistent — new users don't understand the color split
   - Goal: role differentiation that coheres with the brand palette
   - Acceptance criteria:
     - Helper card uses a secondary brand color (e.g., indigo-500 or a darker teal) that clearly differs from employer teal without feeling out-of-place
     - Update any other orange-500 role references consistently
     - Add a short explanatory label under each role card (e.g., "You'll see this color on your helper's view")
   - Priority: Medium / Effort Low-Medium
   - Status: backlog
   - Added: 2026-03-30

26. **Add collapsible secondary fields in onboarding member step**
   - Source: UI/UX audit
   - Problem: member step shows 6 fields per member with no grouping — feels like an unbroken form scroll, increases perceived effort
   - Goal: reduce cognitive load for multi-member households
   - Acceptance criteria:
     - Show 2–3 primary fields (name, role, age) expanded by default
     - Secondary fields (routines, notes, preferences) in a disclosure/accordion
     - Disclosure opens automatically when primary fields are filled
     - State preserved when accordion closes (no data loss)
     - Single-member households unaffected (no accordion needed)
   - Priority: Medium / Effort Medium
   - Status: backlog
   - Added: 2026-03-30

### Big Bets

30. **Google Calendar sync integration**
   - Source: you
   - Problem: HelperSync timetable lives separately from users' day-to-day calendar workflow
   - Goal: let users sync schedules with Google Calendar for better adoption and execution
   - Acceptance criteria:
     - Secure OAuth connect/disconnect flow
     - One-way sync v1 (HelperSync -> Google Calendar), with optional two-way sync later
     - Event create/update/delete remains consistent
     - Timezone and recurrence handling are correct
     - Sync status and error states are visible to users
   - Priority: Medium-High / Effort High
   - Status: backlog
   - Added: 2026-03-30

31. **Stitch-guided UI beautification pass**
   - Source: you
   - Problem: UI needs a deliberate visual-polish phase, but ad-hoc styling changes can create inconsistency
   - Goal: use Stitch to generate polished UI concepts, then translate only approved patterns into production components
   - Recommended rollout:
     - Pick 3 high-traffic surfaces first (dashboard home, onboarding summary, timetable review)
     - Generate 2-3 Stitch variants per surface and select one direction
     - Extract reusable design tokens (spacing, radii, shadows, typography, color roles)
     - Implement as a component-level refresh, not page-by-page one-offs
     - Add a before/after QA checklist for accessibility and responsiveness
   - Acceptance criteria:
     - Shared style primitives documented (tokens or constants)
     - No regression in dark mode, mobile layout, or readability
     - Contrast and focus states meet accessibility expectations
     - Existing UX improvements in backlog still remain intact after restyling
   - Priority: Medium / Effort Medium-High
   - Status: backlog
   - Added: 2026-03-30

