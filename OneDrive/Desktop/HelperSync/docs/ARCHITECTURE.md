# Architecture

## What is HelperSync?

A household helper management app. Employers onboard, generate AI-powered weekly schedules, and helpers follow task-by-task timelines with photo check-ins.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router), React 18, Tailwind, Framer Motion |
| Backend | Convex (real-time DB + serverless functions) |
| AI | Claude (Anthropic SDK) via Next.js API routes |
| Auth | Clerk |
| Payments | Polar |

## Key Modules

### 1. Onboarding (`src/components/onboarding/`, `src/app/onboarding/`)
8-step employer wizard: home description, members, priorities, routines, helper details, AI schedule generation, Spotify-style schedule review with per-category feedback.

### 2. Timetable (`src/components/timetable/`, `src/app/dashboard/timetable/`)
Employer-facing day-by-day timeline editor. Drag-and-drop tasks, add/edit/delete, daily instructions. Uses `DayTimelineView`, `LiveDayColumn`, `AddTaskDialog`.

### 3. Helper View (`src/components/helper/`, `src/app/helper/`)
Helper-facing daily task list with swipeable completion, photo upload proof, day selector strip.

### 4. AI Layer (`src/lib/prompts/`, `src/app/api/ai/`)
Prompt templates + API routes for: timetable generation, schedule parsing, household parsing, task translation, chat, schedule change application.

### 5. Convex Backend (`convex/`)
Schema, mutations, queries for: households, timetable, schedules, task logs, task overrides, task instructions, days off, helper sessions, subscriptions.

### 6. Layout & Navigation (`src/components/layout/`)
TopNav, SidebarNav, AiSidebar (chat), AiFab, TrialBanner, HelperTopBar.

### 7. i18n (`src/lib/i18n/`)
English, Indonesian, Tagalog, Burmese translations for helper-facing task names.

## Data Flow

```
Onboarding Wizard → AI Generate Timetable → Convex DB
                                                ↓
Employer Dashboard ← Convex queries ← Helper App
        ↓                                    ↓
  Edit tasks/instructions              Complete tasks + photos
        ↓                                    ↓
   Convex mutations → real-time sync → Convex task logs
```

## File Size Hotspots (candidates for splitting)

| File | Lines | Status |
|------|-------|--------|
| `Step9ScheduleReview.tsx` | 1268 | Needs split |
| `dashboard/timetable/page.tsx` | 673 | Needs split |
| `LiveDayColumn.tsx` | 479 | Monitor |
| `Step4DailyLife.tsx` | 409 | Monitor |
| `AiSidebar.tsx` | 406 | Monitor |
