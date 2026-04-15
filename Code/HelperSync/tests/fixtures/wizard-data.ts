// Representative test data for each onboarding step.
// Chosen to satisfy every canProceed() guard.

export const STEP1_DATA = {
  setupFor: "own" as const,
  firstTimeEmployer: false,
  householdFocus: ["cleanliness", "meals"] as string[],
  helperHasPhone: true,
};

export const STEP2_DATA = {
  homeName: "The Test Family Home",
  homeSize: "midsize" as const,
  rooms: ["Master Bedroom", "Kitchen", "Living Room", "Bathroom"],
};

export const STEP3_MEMBERS = [
  { name: "David", role: "Husband", age: 35 },
  { name: "Sarah", role: "Wife", age: 35 },
];

export const STEP5_DATA = {
  experience: "some" as const,
  pace: "balanced" as const,
};

export const STEP6_HELPER = {
  name: "Maria Santos",
  nationality: "Philippines",
  phone: "",
  language: "en",
};

// Mock tasks that match the AI mock route's output shape (16 tasks × 7 days)
const MOCK_TASKS = [
  { time: "06:30", duration: 30, taskName: "Prepare Breakfast", area: "Kitchen", category: "Meal Prep", emoji: "🍳", recurring: true, requiresPhoto: false },
  { time: "07:00", duration: 30, taskName: "Clean Kitchen After Breakfast", area: "Kitchen", category: "Household Chores", emoji: "🧹", recurring: true, requiresPhoto: false },
  { time: "07:30", duration: 45, taskName: "Laundry — Wash & Hang", area: "Yard", category: "Household Chores", emoji: "👕", recurring: true, requiresPhoto: true },
  { time: "08:30", duration: 30, taskName: "Sweep & Mop Living Room", area: "Living Room", category: "Household Chores", emoji: "🧹", recurring: true, requiresPhoto: true },
  { time: "09:00", duration: 30, taskName: "Clean Master Bedroom", area: "Master Bedroom", category: "Household Chores", emoji: "🛏️", recurring: true, requiresPhoto: true },
  { time: "09:30", duration: 30, taskName: "Clean Bathrooms", area: "Bathroom 1", category: "Household Chores", emoji: "🚿", recurring: true, requiresPhoto: true },
  { time: "10:00", duration: 15, taskName: "Morning Break", area: "Kitchen", category: "Break", emoji: "☕", recurring: true, requiresPhoto: false },
  { time: "10:15", duration: 30, taskName: "Wipe Down Surfaces", area: "Kitchen", category: "Household Chores", emoji: "🧽", recurring: true, requiresPhoto: false },
  { time: "11:00", duration: 60, taskName: "Prepare Lunch", area: "Kitchen", category: "Meal Prep", emoji: "🍲", recurring: true, requiresPhoto: false },
  { time: "12:00", duration: 60, taskName: "Lunch Break", area: "Kitchen", category: "Break", emoji: "🍽️", recurring: true, requiresPhoto: false },
  { time: "13:00", duration: 30, taskName: "Fold & Iron Laundry", area: "Living Room", category: "Household Chores", emoji: "👔", recurring: true, requiresPhoto: false },
  { time: "13:30", duration: 30, taskName: "Vacuum Common Areas", area: "Living Room", category: "Household Chores", emoji: "🧹", recurring: true, requiresPhoto: false },
  { time: "14:00", duration: 15, taskName: "Afternoon Break", area: "Kitchen", category: "Break", emoji: "☕", recurring: true, requiresPhoto: false },
  { time: "14:15", duration: 45, taskName: "Grocery Shopping", area: "Kitchen", category: "Errands", emoji: "🛒", recurring: false, requiresPhoto: false },
  { time: "17:00", duration: 60, taskName: "Prepare Dinner", area: "Kitchen", category: "Meal Prep", emoji: "🍛", recurring: true, requiresPhoto: false },
  { time: "18:00", duration: 30, taskName: "Clean Kitchen After Dinner", area: "Kitchen", category: "Household Chores", emoji: "🧹", recurring: true, requiresPhoto: false },
];

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export const MOCK_WEEKLY_TASKS = DAYS.map((day) => ({
  day,
  tasks: MOCK_TASKS.map((t, i) => ({ ...t, taskId: `${day}-${i + 1}` })),
}));

// Full seeded wizard state — used by seedAndNavigateTo() to jump to any step
export const BASE_WIZARD_STATE = {
  setupFor: "own",
  firstTimeEmployer: false,
  householdFocus: ["cleanliness", "meals"],
  helperHasPhone: true,
  homeName: "The Test Family Home",
  homeDescription: "",
  homeSize: "midsize",
  rooms: ["Master Bedroom", "Kitchen", "Living Room", "Bathroom"],
  deepCleanTasks: [],
  members: STEP3_MEMBERS,
  priorities: ["cleanliness", "meals"],
  routines: "",
  memberRoutines: {},
  memberSchedules: {},
  memberQuietHours: {},
  servicePrefs: {},
  helperExperience: "some",
  helperPace: "balanced",
  employerAvailability: null,
  wifeAvailability: null,
  helperDetails: {
    name: "Maria Santos",
    nationality: "Philippines",
    phone: "",
    language: "en",
  },
  inviteCode: "TST123",
  inviteQrData: "http://localhost:3000/join/TST123",
  weeklyTasks: null,
};
