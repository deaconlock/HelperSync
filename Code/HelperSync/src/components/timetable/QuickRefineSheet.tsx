"use client";

import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickRefineSheetProps {
  open: boolean;
  onClose: () => void;
  onRegenerate: (feedback: string) => Promise<void>;
}

// ─── Option definitions ───────────────────────────────────────────────────────

interface Option {
  id: string;
  emoji: string;
  label: string;
  direct?: boolean;
  intensity?: boolean; // show Slightly/Moderately/Significantly chips
  subs?: SubOption[];
  anchor?: AnchorConfig;
}

interface SubOption {
  id: string;
  label: string;
  buildPrompt: (anchor?: string, intensity?: string) => string;
}

interface AnchorConfig {
  question: string;
  chips: string[];
  forSubs?: string[]; // only show anchor when these sub-option ids are selected
}

const INTENSITY_CHIPS = ["Slightly", "Moderately", "Significantly"];

const OPTIONS: Option[] = [
  {
    id: "timing",
    emoji: "⏰",
    label: "Timing is off",
    anchor: {
      question: "What time should the day start?",
      chips: ["6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM"],
    },
    subs: [
      {
        id: "earlier",
        label: "Start tasks earlier",
        buildPrompt: (anchor) =>
          `Shift the first task to start at ${anchor ?? "6:30 AM"} and rebalance all subsequent tasks proportionally. Do NOT move breakfast before 6:30 AM. Do NOT add new tasks or change task names — only adjust timings.`,
      },
      {
        id: "later",
        label: "Start tasks later",
        buildPrompt: (anchor) =>
          `Shift the first task to start at ${anchor ?? "8:00 AM"} and rebalance all subsequent tasks proportionally. Preserve all task names, areas, and categories — only adjust timings.`,
      },
      {
        id: "spread",
        label: "Spread tasks throughout the day",
        buildPrompt: () =>
          `Redistribute tasks more evenly across the full work window so there are no clusters of back-to-back tasks. Add small gaps (10–15 min) between task blocks. Preserve all task names, areas, categories, and meal times — only adjust spacing.`,
      },
    ],
  },
  {
    id: "cleaning",
    emoji: "🧹",
    label: "Cleaning load",
    subs: [
      {
        id: "less",
        label: "Less cleaning overall",
        buildPrompt: () =>
          `Reduce cleaning tasks. Remove 2–3 non-essential cleaning tasks (e.g. deep cleans, window wiping) and replace with lighter tidying. Preserve all meal prep, childcare, elderly care, and break tasks exactly as they are.`,
      },
      {
        id: "more",
        label: "More cleaning overall",
        buildPrompt: () =>
          `Add more thorough cleaning tasks across the week. Increase room-by-room cleaning frequency and add at least one deep clean task. Preserve all meal prep, childcare, and break tasks exactly as they are.`,
      },
      {
        id: "redistribute",
        label: "Redistribute across days",
        buildPrompt: () =>
          `Redistribute cleaning tasks so no single day is overloaded. Spread heavy cleaning (bathrooms, bedrooms, kitchen deep clean) across different days. Preserve all task names and meal times — only move cleaning tasks to different days.`,
      },
    ],
  },
  {
    id: "kids",
    emoji: "👶",
    label: "Adjust for kids routine",
    anchor: {
      question: "What time is school pickup?",
      chips: ["2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM"],
      forSubs: ["pickup"],
    },
    subs: [
      {
        id: "pickup",
        label: "Adjust around school pickup",
        buildPrompt: (anchor) =>
          `School pickup is at ${anchor ?? "3:00 PM"}. On weekdays, ensure no task is scheduled during ${anchor ?? "3:00 PM"} ± 30 minutes. Add an afternoon snack prep task at ${anchor ?? "3:30 PM"} after pickup. Preserve all other tasks.`,
      },
      {
        id: "snack",
        label: "Add afternoon snack prep",
        buildPrompt: () =>
          `Add an "Afternoon snack prep" task on weekdays at approximately 3:30 PM in the Kitchen. Category: Meal Prep. Do not remove or move any existing tasks — insert this task into the schedule.`,
      },
      {
        id: "quiet_mornings",
        label: "Quieter mornings",
        buildPrompt: () =>
          `On weekdays, move all noisy tasks (vacuuming, mopping, washing machine, blender) to after 9:00 AM. Before 9:00 AM, only light tasks are allowed (tidying, breakfast prep, folding). Preserve all task names — only adjust timing and reorder where needed.`,
      },
    ],
  },
  {
    id: "meals",
    emoji: "🍳",
    label: "Meals need changes",
    anchor: {
      question: "What time is dinner usually?",
      chips: ["6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM"],
    },
    subs: [
      {
        id: "earlier",
        label: "Earlier mealtimes",
        buildPrompt: (anchor) =>
          `Shift dinner prep so that dinner is ready by ${anchor ?? "6:00 PM"}, and adjust lunch and breakfast prep proportionally earlier. Preserve all non-meal tasks — only change meal prep and cooking task times.`,
      },
      {
        id: "later",
        label: "Later mealtimes",
        buildPrompt: (anchor) =>
          `Shift dinner prep so that dinner is ready by ${anchor ?? "7:30 PM"}, and adjust lunch and breakfast prep proportionally. Preserve all non-meal tasks — only change meal prep and cooking task times.`,
      },
      {
        id: "more_prep",
        label: "More meal prep time",
        buildPrompt: () =>
          `Increase the duration of meal prep tasks by 15–30 minutes each (breakfast, lunch, dinner). Adjust surrounding tasks to accommodate the longer prep blocks. Preserve all task names and categories.`,
      },
    ],
  },
  {
    id: "workload",
    emoji: "💤",
    label: "Helper workload too heavy",
    subs: [
      {
        id: "lighter",
        label: "Lighter schedule overall",
        buildPrompt: () =>
          `Reduce the total number of tasks per day by 2–3, removing the least essential ones (prioritise preserving meals, childcare, elderly care, and breaks). Target no more than 8 tasks per day. Add 10–15 min gaps between remaining tasks.`,
      },
      {
        id: "no_deep_clean",
        label: "Remove deep clean tasks",
        buildPrompt: () =>
          `Remove all deep cleaning tasks from the schedule (e.g. kitchen hood degreasing, grout scrubbing, window cleaning, mattress vacuuming, fridge deep clean). Preserve all daily routine tasks and meal prep.`,
      },
      {
        id: "more_breaks",
        label: "More break time",
        buildPrompt: () =>
          `Add an extra 15-minute break in the morning (around 10:30 AM) in addition to the existing lunch and afternoon breaks. Ensure no task block runs longer than 2 hours without a rest. Adjust surrounding task times to accommodate breaks.`,
      },
    ],
  },
  {
    id: "mornings",
    emoji: "🌅",
    label: "Make mornings smoother",
    direct: true,
    intensity: true,
    subs: [
      {
        id: "go",
        label: "Apply",
        buildPrompt: (_, intensity) => {
          if (intensity === "Slightly")
            return `Move only noisy tasks (vacuuming, mopping, washing machine) to after 9:00 AM. Keep all other morning tasks unchanged.`;
          if (intensity === "Significantly")
            return `Before 9:00 AM, keep ONLY breakfast preparation. Move all other tasks to 9:00 AM or later.`;
          return `Before 9:00 AM, keep only essential tasks: breakfast preparation and light tidying. Move all cleaning, vacuuming, mopping, and laundry to 9:00 AM or later.`;
        },
      },
    ],
  },
  {
    id: "evenings",
    emoji: "🌆",
    label: "Free up evenings",
    direct: true,
    intensity: true,
    subs: [
      {
        id: "go",
        label: "Apply",
        buildPrompt: (_, intensity) => {
          if (intensity === "Slightly")
            return `After 6:00 PM, allow a maximum of 4 tasks. Move the least essential post-6pm tasks earlier in the day.`;
          if (intensity === "Significantly")
            return `After 6:00 PM, keep ONLY dinner service and washing up. Move all other tasks before 6:00 PM.`;
          return `After 6:00 PM, allow a maximum of 3 tasks, prioritising dinner-related tasks. Shift other non-essential evening tasks earlier.`;
        },
      },
    ],
  },
  {
    id: "cluster",
    emoji: "📦",
    label: "Cluster tasks by room",
    direct: true,
    subs: [
      {
        id: "go",
        label: "Apply",
        buildPrompt: () =>
          `Resequence tasks within each day to minimise switching between rooms or areas by grouping tasks by location. Do not change total task count, task durations, or task names. Only reorder tasks within each day. Maintain chronological feasibility — do not create time overlaps or unrealistic gaps. Keep task start times as close as possible to the original unless minor adjustments are required.`,
      },
    ],
  },
  {
    id: "restday",
    emoji: "🛋",
    label: "Lighter on Sundays",
    direct: true,
    intensity: true,
    subs: [
      {
        id: "go",
        label: "Apply",
        buildPrompt: (_, intensity) => {
          if (intensity === "Slightly")
            return `On Sunday only: remove all deep cleaning tasks (hood, grout, windows, fridge). Keep all regular tasks.`;
          if (intensity === "Significantly")
            return `On Sunday only: keep ONLY breakfast, a light tidy, and dinner preparation, with a maximum of 4 tasks total. Remove all other tasks.`;
          return `On Sunday only: remove all deep cleaning and heavy chores. Limit the total number of tasks to a maximum of 5 to 6. Keep meals and light tidying.`;
        },
      },
    ],
  },
  {
    id: "custom",
    emoji: "✍️",
    label: "Custom instruction",
  },
];

const PRESERVATION_RULE = `\n\nIMPORTANT: Preserve all other tasks, their names, and their relative order unless adjustment is required to satisfy the change above. Do not add or remove tasks unless explicitly required by the instructions above. Do not rename tasks or change their categories. Maintain logical task dependencies (e.g. preparation before serving, cleaning after use). Ensure the schedule remains within a reasonable working day and does not extend significantly later than the original end time unless required.`;

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickRefineSheet({ open, onClose, onRegenerate }: QuickRefineSheetProps) {
  const [step, setStep] = useState<"main" | "sub">("main");
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [selectedSub, setSelectedSub] = useState<SubOption | null>(null);
  const [anchorValue, setAnchorValue] = useState<string | null>(null);
  const [intensityValue, setIntensityValue] = useState<string>("Moderately");
  const [customText, setCustomText] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);

  const reset = () => {
    setStep("main");
    setSelectedOption(null);
    setSelectedSub(null);
    setAnchorValue(null);
    setIntensityValue("Moderately");
    setCustomText("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleOptionTap = (opt: Option) => {
    setSelectedOption(opt);
    setStep("sub");
    if (opt.direct && opt.subs?.[0]) setSelectedSub(opt.subs[0]);
  };

  const showAnchor = selectedOption?.anchor && (
    !selectedOption.anchor.forSubs ||
    (selectedSub && selectedOption.anchor.forSubs.includes(selectedSub.id))
  );

  const canRegenerate = (() => {
    if (!selectedOption) return false;
    if (selectedOption.id === "custom") return customText.trim().length > 0;
    if (selectedOption.direct) return true; // intensity always has a default
    if (!selectedSub) return false;
    if (selectedOption.anchor?.forSubs?.includes(selectedSub.id) && !anchorValue) return false;
    return true;
  })();

  const handleRegenerate = async () => {
    if (!selectedOption) return;
    let body = "";
    if (selectedOption.id === "custom") {
      body = customText.trim();
    } else if (selectedSub) {
      const anchor = anchorValue ?? selectedOption.anchor?.chips[2] ?? undefined;
      body = selectedSub.buildPrompt(anchor, intensityValue);
    }
    setIsRegenerating(true);
    try {
      await onRegenerate(body + PRESERVATION_RULE);
      handleClose();
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <div className="pb-2">
        {step === "main" && (
          <>
            <p className="text-sm font-semibold text-gray-900 mb-0.5">What would you like to adjust?</p>
            <p className="text-xs text-gray-400 mb-4">Pick one — we'll regenerate in ~30 seconds.</p>
            <div className="flex flex-col gap-2">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleOptionTap(opt)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-left bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-base leading-none">{opt.emoji}</span>
                  <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "sub" && selectedOption && (
          <>
            <button
              onClick={() => { setStep("main"); setSelectedSub(null); setAnchorValue(null); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3 -ml-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>

            <p className="text-sm font-semibold text-gray-900 mb-0.5">
              {selectedOption.emoji} {selectedOption.label}
            </p>

            {/* Custom text input */}
            {selectedOption.id === "custom" && (
              <>
                <p className="text-xs text-gray-400 mb-3">Describe what you'd like to change.</p>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="e.g. Move laundry to evenings, no cleaning on Sundays"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  rows={3}
                />
              </>
            )}

            {/* Direct confirm description */}
            {selectedOption.direct && (
              <p className="text-xs text-gray-400 mt-1 mb-3">
                This will adjust the relevant tasks while preserving everything else.
              </p>
            )}

            {/* Sub-options (non-direct, non-custom) */}
            {!selectedOption.direct && selectedOption.id !== "custom" && selectedOption.subs && (
              <>
                <p className="text-xs text-gray-400 mb-3">Choose what to do.</p>
                <div className="flex flex-col gap-2">
                  {selectedOption.subs.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => { setSelectedSub(sub); setAnchorValue(null); }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all border",
                        selectedSub?.id === sub.id
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-gray-50 text-gray-800 border-transparent hover:bg-gray-100"
                      )}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Anchor chips */}
            {showAnchor && selectedOption.anchor && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-600 mb-2">{selectedOption.anchor.question}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedOption.anchor.chips.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setAnchorValue(chip)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                        anchorValue === chip
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Intensity chips */}
            {selectedOption.intensity && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-600 mb-2">How much?</p>
                <div className="flex gap-2">
                  {INTENSITY_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setIntensityValue(chip)}
                      className={cn(
                        "flex-1 py-1.5 rounded-full text-xs font-medium border transition-all",
                        intensityValue === chip
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleRegenerate}
              disabled={!canRegenerate || isRegenerating}
              className={cn(
                "mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all",
                canRegenerate && !isRegenerating
                  ? "bg-gray-900 text-white hover:opacity-90"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {isRegenerating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Regenerating…</>
                : "Regenerate (~30 sec)"
              }
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
