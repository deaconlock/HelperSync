export type TaskCategory =
  | "Household Chores"
  | "Baby Care"
  | "Elderly Care"
  | "Meal Prep"
  | "Errands"
  | "Break";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export const CATEGORY_COLORS: Record<string, string> = {
  "Household Chores": "bg-slate-50 text-slate-700 border-slate-200",
  "Baby Care": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "Elderly Care": "bg-violet-50 text-violet-700 border-violet-100",
  "Meal Prep": "bg-amber-50 text-amber-700 border-amber-100",
  Errands: "bg-rose-50 text-rose-700 border-rose-100",
  Break: "bg-teal-50 text-teal-600 border-teal-100",
};

export const CATEGORY_BG_COLORS: Record<string, string> = {
  "Household Chores": "bg-slate-50 border-slate-200",
  "Baby Care": "bg-emerald-50 border-emerald-100",
  "Elderly Care": "bg-violet-50 border-violet-100",
  "Meal Prep": "bg-amber-50 border-amber-100",
  Errands: "bg-rose-50 border-rose-100",
  Break: "bg-teal-50 border-teal-100",
};

export const CATEGORY_ACCENT_COLORS: Record<string, string> = {
  "Household Chores": "border-l-slate-400",
  "Baby Care": "border-l-emerald-400",
  "Elderly Care": "border-l-violet-400",
  "Meal Prep": "border-l-amber-400",
  Errands: "border-l-rose-400",
  Break: "border-l-teal-400",
};

export const CATEGORY_ACCENT_BG: Record<string, string> = {
  "Household Chores": "bg-slate-400",
  "Baby Care": "bg-emerald-400",
  "Elderly Care": "bg-violet-400",
  "Meal Prep": "bg-amber-400",
  Errands: "bg-rose-400",
  Break: "bg-teal-400",
};

export const CATEGORY_EMOJIS: Record<string, string> = {
  "Household Chores": "🧹",
  "Baby Care": "🍼",
  "Elderly Care": "👴",
  "Meal Prep": "🍳",
  Errands: "🛍️",
  Break: "☕",
};

export interface TaskItem {
  taskId: string;
  time: string;
  duration?: number; // in minutes, default 30
  taskName: string;
  area: string;
  category: string;
  recurring: boolean;
  requiresPhoto: boolean;
  emoji?: string;
  notes?: string;
  passive?: boolean; // true = runs unattended (wash cycle, oven, soaking) — can overlap with active tasks
}

export interface DayTasks {
  day: DayOfWeek;
  tasks: TaskItem[];
}

export interface TimetableDoc {
  _id: string;
  householdId: string;
  weeklyTasks: DayTasks[];
}
