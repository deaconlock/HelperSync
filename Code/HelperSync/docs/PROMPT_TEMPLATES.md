# Prompt Templates

Copy-paste these into Cursor. Replace `{placeholders}`.

---

## Bug Fix

```
Module: {M1-M7}
File: {file path}
Function: {function name}

Bug: {what's wrong}
Expected: {what should happen}
Actual: {what happens instead}

Error (if any):
{paste error message, max 10 lines}

Relevant code (lines {N}-{M}):
{paste only the broken section}
```

---

## Feature — Design Phase

```
Module: {M1-M7}
Feature: {one-line description}

Context: {2-3 sentences about current state}

Requirements:
1. {requirement}
2. {requirement}

Constraints:
- Must not break {existing behavior}
- Types are in src/types/{file}.ts

Output: A step-by-step plan. No code yet.
```

---

## Feature — Implementation

```
Module: {M1-M7}
Plan: {paste the plan from design phase, or summarize in 3-5 bullets}

File to edit: {path}
Function to edit: {name} (lines {N}-{M})

Types (paste if not already in context):
{paste relevant interface, max 20 lines}

Write the code. Match existing style (Tailwind, cn(), lucide icons).
```

---

## Refactor — Extract Component

```
File: {path} ({N} lines — too large)
Target: Extract {description} into its own file.

The section to extract (lines {N}-{M}):
{paste the section}

Props it will need:
- {prop}: {type}

It currently uses these from parent scope:
- {variable}: {type}

Create the new component file and show the updated parent import.
```

---

## Refactor — Extract Hook

```
File: {path}
Target: Extract {state + logic description} into a custom hook.

State variables involved:
- {name}: {type}

Functions involved:
- {name}({params}): {return type}

Side effects: {useEffect descriptions, API calls, etc.}

Create src/hooks/{hookName}.ts and show updated component.
```

---

## Quick Edit

```
File: {path}, line {N}
Change: {what to change, in one sentence}
```
