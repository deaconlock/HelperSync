# AI Rules — Minimize Token Usage in Cursor

## DOs

1. **Reference modules, not files.** Say "work on M2 (Schedule Review)" instead of pasting 1200 lines.
2. **Use line ranges.** "Read Step9ScheduleReview.tsx lines 147-173" not the whole file.
3. **One module per prompt.** Never mix onboarding + dashboard + helper in one request.
4. **State the function name.** "Edit `FinalSlide` in Step9ScheduleReview.tsx" — AI can grep for it.
5. **Include types upfront.** Paste `src/types/timetable.ts` (small) so AI doesn't guess interfaces.
6. **Use ARCHITECTURE.md as system prompt.** Add it to Cursor's project context so AI always has the overview.
7. **Describe inputs/outputs.** "This function takes `DayTasks[]` and returns `SlideData[]`" saves AI from reading 200 lines of surrounding code.
8. **Split prompts by concern.** Separate "design the approach" from "write the code" from "review the code."

## DON'Ts

1. **Don't paste entire files over 200 lines.** Extract the relevant function or section.
2. **Don't ask AI to "look at the whole codebase."** Point it to the specific module.
3. **Don't repeat context across prompts.** If AI already knows the types, don't re-paste them.
4. **Don't ask open-ended "improve this" questions.** Be specific: "reduce re-renders in X" or "extract Y into a hook."
5. **Don't include generated files.** Never paste `convex/_generated/*` — just reference the schema.
6. **Don't paste package.json** unless the task is about dependencies.
7. **Don't include imports in snippets** unless the task is about imports. AI can infer them.

## File Size Rules

| Lines | Action |
|-------|--------|
| < 200 | Safe to include fully |
| 200-400 | Include only the relevant function(s) |
| 400+ | Must split before working on it (see ARCHITECTURE.md hotspots) |

## Cursor-Specific Tips

- Add `docs/ARCHITECTURE.md` and `docs/MODULES.md` to Cursor's "Always include" context.
- Use `@file` references sparingly — prefer `@symbol` to pull in just a function.
- When debugging, include the error message + the 20 lines around it, not the full file.
- For refactors, describe the current structure in 2-3 sentences instead of pasting it.
