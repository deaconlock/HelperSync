# Module Map

Each module can be worked on independently. When prompting AI, include ONLY files from the relevant module.

## Module Boundaries

### M1: Onboarding Wizard
```
src/app/onboarding/employer/page.tsx    ← orchestrator (step routing, state)
src/components/onboarding/WizardShell.tsx
src/components/onboarding/steps/Step1*.tsx
src/components/onboarding/steps/Step2*.tsx
src/components/onboarding/steps/Step3*.tsx
src/components/onboarding/steps/Step4*.tsx
src/components/onboarding/steps/Step5*.tsx
src/components/onboarding/steps/Step7*.tsx  (alias of Step5HelperDetails)
src/components/onboarding/steps/Step8*.tsx
src/components/onboarding/steps/Step9*.tsx
src/types/household.ts
src/types/timetable.ts
src/types/schedule.ts
```
**Shared dependency:** `src/types/*` — read-only from this module's perspective.

### M2: Schedule Review (sub-module of M1, but large enough to isolate)
```
src/components/onboarding/steps/Step9ScheduleReview.tsx
src/components/timetable/DayTimelineView.tsx
src/components/timetable/AddTaskDialog.tsx
src/types/timetable.ts
```

### M3: Timetable Editor (employer dashboard)
```
src/app/dashboard/timetable/page.tsx
src/components/timetable/DayTimelineView.tsx
src/components/timetable/DayColumn.tsx
src/components/timetable/LiveDayColumn.tsx
src/components/timetable/AddTaskDialog.tsx
src/components/timetable/TaskChip.tsx
src/components/timetable/SwipeableTaskItem.tsx
src/components/timetable/DailyInstructionDialog.tsx
src/types/timetable.ts
convex/timetable.ts
convex/taskOverrides.ts
convex/taskInstructions.ts
```

### M4: Helper App
```
src/app/helper/**
src/components/helper/*
src/hooks/useTaskTranslations.ts
src/lib/i18n/*
convex/taskLogs.ts
convex/helperSessions.ts
```

### M5: AI Layer
```
src/app/api/ai/*/route.ts
src/lib/prompts/*.ts
src/lib/claude.ts
src/lib/ai-context.tsx
src/types/ai.ts
```

### M6: Convex Backend
```
convex/schema.ts
convex/households.ts
convex/schedules.ts
convex/timetable.ts
convex/taskLogs.ts
convex/taskOverrides.ts
convex/taskInstructions.ts
convex/daysOff.ts
convex/helperSessions.ts
convex/subscriptions.ts
```

### M7: Layout & Navigation
```
src/components/layout/*
src/app/dashboard/layout.tsx
src/app/helper/layout.tsx
src/app/layout.tsx
```

## Cross-Module Rules

1. **Types are shared** — `src/types/*` is read by all modules. Changes here affect everything.
2. **Convex schema is the source of truth** — `convex/schema.ts` defines all data shapes.
3. **AI routes are stateless** — they read wizard/dashboard data, call Claude, return JSON.
4. **Components never import from `convex/` directly** — they go through hooks or page-level queries.

## When working on a module

- Include only that module's files in context
- Include `src/types/timetable.ts` if the module uses task data
- Include `convex/schema.ts` only if modifying data shape
- Never need full `page.tsx` orchestrators for component-level work
