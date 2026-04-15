# Refactor Plan — Large File Splits

## Priority 1: `Step9ScheduleReview.tsx` (1268 lines)

This file contains 6 distinct concerns. Split into:

| New File | Lines | What moves |
|----------|-------|------------|
| `ScheduleSlideshow.tsx` | ~150 | `ScheduleSlideshow` component, slide navigation, dot indicators, tap zones |
| `FinalSlide.tsx` | ~120 | `FinalSlide` component, `REFINE_STEPS`, progress animation, category feedback consolidation |
| `buildSlides.ts` | ~400 | `buildSlides()` function, all slide construction (meals, chores, baby, elderly, errands) |
| `slideHelpers.tsx` | ~80 | `SlideFeedbackInput`, `StaggerChild`, `CoverageBadge`, `TruncatedPills`, `GLASS_CARD`, `STATUS_COLORS` |
| `slideUtils.ts` | ~30 | `timeToMinutes`, `formatFrequency`, `getCoverageVerdict`, `CATEGORY_EMOJI`, `CATEGORY_LABEL` |
| `Step9ScheduleReview.tsx` | ~200 | Main component only: state, `handleRefineWithAI`, phase switching, timeline editor rendering |

**Dependency graph:**
```
Step9ScheduleReview (main)
  ├── ScheduleSlideshow
  │     ├── buildSlides (returns SlideData[])
  │     │     ├── slideHelpers (SlideFeedbackInput, CoverageBadge, etc.)
  │     │     └── slideUtils (timeToMinutes, getCoverageVerdict, etc.)
  │     └── FinalSlide
  └── DayTimelineView, AddTaskDialog (already separate)
```

## Priority 2: `dashboard/timetable/page.tsx` (673 lines)

Split into:

| New File | What moves |
|----------|------------|
| `hooks/useTimetableEditor.ts` | All state management: selectedDay, task CRUD, drag handlers, Convex mutations |
| `TimetableHeader.tsx` | Day selector tabs, week navigation |
| `timetable/page.tsx` | Slim orchestrator importing hook + components |

## Priority 3: `LiveDayColumn.tsx` (479 lines)

Split into:

| New File | What moves |
|----------|------------|
| `TimeGrid.tsx` | Hour markers, current-time indicator, grid rendering |
| `LiveDayColumn.tsx` | Task positioning, drag-and-drop, task rendering |

## When to split (rule of thumb)

- **> 400 lines:** Must split before next feature addition.
- **> 200 lines:** Split if you're about to add significant new logic.
- **< 200 lines:** Leave as-is.

## How to split safely

1. Start by extracting pure utilities/helpers (no state) — zero risk.
2. Then extract presentational sub-components (props in, JSX out).
3. Last, extract stateful hooks (most complex, test after).
4. Keep the main file as a thin orchestrator.
