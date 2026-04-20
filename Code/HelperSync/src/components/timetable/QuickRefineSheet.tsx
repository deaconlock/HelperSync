"use client";

import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { HouseholdMember } from "@/types/household";

interface Props {
  open: boolean;
  onClose: () => void;
  onRegenerate: (feedback: string) => Promise<void>;
  household?: { _id?: string; rooms: string[]; members: HouseholdMember[] } | null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type BucketId = "baby" | "elderly" | "meals" | "cleaning" | "kids" | "timing" | "pets";
type BucketChanges = Record<string, string | string[]>;
type AllChanges = Partial<Record<BucketId, BucketChanges>>;

interface Control {
  id: string;
  label: string;
  multi: boolean;
  options: string[];
}

interface Bucket {
  id: BucketId;
  emoji: string;
  label: string;
  showIf: (members: HouseholdMember[]) => boolean;
  controls: Control[];
  buildFeedback: (vals: BucketChanges) => string;
}

// ─── Bucket definitions ───────────────────────────────────────────────────────

const BUCKETS: Bucket[] = [
  {
    id: "baby",
    emoji: "🍼",
    label: "Baby & Infant",
    showIf: (m) => m.some((x) => x.role === "Child" && (x.age ?? 99) <= 2),
    controls: [
      { id: "feeding", label: "Feeding times", multi: true, options: ["6:00 AM", "9:00 AM", "12:00 PM", "3:00 PM", "6:00 PM", "9:00 PM"] },
      { id: "sterilisation", label: "Bottle sterilisation", multi: false, options: ["After every feed", "Once in the morning", "Overnight soak", "No bottles"] },
    ],
    buildFeedback: (v) => [
      (v.feeding as string[])?.length && `Baby feeds at ${(v.feeding as string[]).join(", ")} — structure care tasks around these times`,
      v.sterilisation && `Bottle sterilisation: ${v.sterilisation}`,
    ].filter(Boolean).join(". "),
  },
  {
    id: "elderly",
    emoji: "💊",
    label: "Elderly Care",
    showIf: (m) => m.some((x) => x.role === "Elderly"),
    controls: [
      { id: "medication", label: "Medication timing", multi: true, options: ["Before breakfast", "After lunch", "Before dinner", "Before bed"] },
      { id: "checkin", label: "Check-in frequency", multi: false, options: ["Every 2 hours", "Every 3 hours", "Morning & evening only"] },
    ],
    buildFeedback: (v) => [
      (v.medication as string[])?.length && `Medication must be given ${(v.medication as string[]).join(" and ")}`,
      v.checkin && `Helper should check in on elderly member ${v.checkin}`,
    ].filter(Boolean).join(". "),
  },
  {
    id: "meals",
    emoji: "🍳",
    label: "Meals",
    showIf: () => true,
    controls: [
      { id: "dinner", label: "Dinner time", multi: false, options: ["6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM"] },
      { id: "complexity", label: "Meal complexity", multi: false, options: ["Light & quick", "Standard", "Elaborate"] },
    ],
    buildFeedback: (v) => [
      v.dinner && `Dinner should be ready by ${v.dinner}`,
      v.complexity && `Meal complexity: ${v.complexity} — adjust prep time accordingly`,
    ].filter(Boolean).join(". "),
  },
  {
    id: "cleaning",
    emoji: "🧹",
    label: "Cleaning",
    showIf: () => true,
    controls: [
      { id: "intensity", label: "Intensity", multi: false, options: ["Light", "Standard", "Thorough"] },
      { id: "distribution", label: "Day distribution", multi: false, options: ["Even all week", "Heavy early week", "Weekends lighter"] },
    ],
    buildFeedback: (v) => [
      v.intensity && `Cleaning intensity: ${v.intensity}`,
      v.distribution && `Cleaning distribution: ${v.distribution}`,
    ].filter(Boolean).join(". "),
  },
  {
    id: "kids",
    emoji: "👶",
    label: "Kids & School",
    showIf: (m) => m.some((x) => x.role === "Child" && (x.age ?? 0) >= 3),
    controls: [
      { id: "pickup", label: "School pickup", multi: false, options: ["2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM"] },
      { id: "afterschool", label: "After school", multi: false, options: ["Snack prep needed", "Quiet time first", "Keep schedule free"] },
    ],
    buildFeedback: (v) => [
      v.pickup && `School pickup at ${v.pickup} — keep that slot clear and add afternoon snack prep after`,
      v.afterschool && `After school: ${v.afterschool}`,
    ].filter(Boolean).join(". "),
  },
  {
    id: "timing",
    emoji: "⏰",
    label: "Timing",
    showIf: () => true,
    controls: [
      { id: "start", label: "Day start", multi: false, options: ["6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM"] },
      { id: "mornings", label: "Mornings feel", multi: false, options: ["Quiet before 9 AM", "Normal pace", "Early & efficient"] },
      { id: "evenings", label: "Evenings", multi: false, options: ["Free after 6 PM", "Free after 7 PM", "Full day is fine"] },
    ],
    buildFeedback: (v) => [
      v.start && `Start the day at ${v.start}`,
      v.mornings && `Morning feel: ${v.mornings}`,
      v.evenings && `Evenings: ${v.evenings}`,
    ].filter(Boolean).join(". "),
  },
  {
    id: "pets",
    emoji: "🐾",
    label: "Pets",
    showIf: (m) => m.some((x) => x.role === "Pets"),
    controls: [
      { id: "walks", label: "Walks per day", multi: false, options: ["1 walk", "2 walks", "3 walks"] },
      { id: "walktimes", label: "Walk times", multi: true, options: ["Early morning", "Midday", "Afternoon", "Evening"] },
    ],
    buildFeedback: (v) => {
      const parts = [
        v.walks && `${v.walks} per day`,
        (v.walktimes as string[])?.length && `at ${(v.walktimes as string[]).join(" and ")}`,
      ].filter(Boolean);
      return parts.length ? `Pet walks: ${parts.join(" — ")}` : "";
    },
  },
];

const PRESERVATION_RULE = `\n\nIMPORTANT: Preserve all other tasks, their names, and their relative order unless adjustment is required. Do not add or remove tasks unless explicitly required. Do not rename tasks or change categories. Maintain logical dependencies. Keep within a reasonable working day.`;

function buildCombinedFeedback(changes: AllChanges, buckets: Bucket[]): string {
  return buckets
    .filter((b) => changes[b.id] && Object.keys(changes[b.id]!).length > 0)
    .map((b) => b.buildFeedback(changes[b.id]!))
    .filter(Boolean)
    .join("\n") + PRESERVATION_RULE;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickRefineSheet({ open, onClose, onRegenerate, household }: Props) {
  const [openBuckets, setOpenBuckets] = useState<Set<BucketId>>(new Set());
  const [changes, setChanges] = useState<AllChanges>({});
  const [isRegenerating, setIsRegenerating] = useState(false);

  const members = household?.members ?? [];
  const visibleBuckets = BUCKETS.filter((b) => b.showIf(members));
  const changedCount = Object.keys(changes).filter((id) => {
    const v = changes[id as BucketId];
    return v && Object.keys(v).length > 0;
  }).length;

  const reset = () => {
    setOpenBuckets(new Set());
    setChanges({});
  };

  const handleClose = () => { reset(); onClose(); };

  const toggleBucket = (id: BucketId) => {
    setOpenBuckets((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const setControl = (bucketId: BucketId, controlId: string, val: string, multi: boolean) => {
    setChanges((prev) => {
      const bucket = { ...(prev[bucketId] ?? {}) };
      if (multi) {
        const current = (bucket[controlId] as string[] | undefined) ?? [];
        const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val];
        if (next.length === 0) delete bucket[controlId];
        else bucket[controlId] = next;
      } else {
        bucket[controlId] = val;
      }
      const next = { ...prev };
      if (Object.keys(bucket).length === 0) delete next[bucketId];
      else next[bucketId] = bucket;
      return next;
    });
  };

  const isSelected = (bucketId: BucketId, controlId: string, val: string, multi: boolean) => {
    const bucket = changes[bucketId];
    if (!bucket) return false;
    if (multi) return ((bucket[controlId] as string[] | undefined) ?? []).includes(val);
    return bucket[controlId] === val;
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerate(buildCombinedFeedback(changes, visibleBuckets));
      reset();
      onClose();
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={handleClose} className="max-h-[85vh] overflow-y-auto">
      <div className="pb-24">
        {/* Header */}
        <p className="text-sm font-semibold text-gray-900 mb-0.5">Tune your plan</p>
        <p className="text-xs text-gray-400 mb-4">Adjust any area, then regenerate.</p>

        {/* Bucket list */}
        <div className="flex flex-col gap-2">
          {visibleBuckets.map((bucket) => {
            const isOpen = openBuckets.has(bucket.id);
            const hasChanges = !!(changes[bucket.id] && Object.keys(changes[bucket.id]!).length > 0);

            return (
              <div key={bucket.id} className="rounded-xl overflow-hidden border border-gray-100">
                {/* Bucket row */}
                <button
                  onClick={() => toggleBucket(bucket.id)}
                  className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="flex items-center gap-2.5 text-sm font-medium text-gray-800">
                    <span>{bucket.emoji}</span>
                    {bucket.label}
                  </span>
                  <span className="flex items-center gap-2">
                    {hasChanges && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </span>
                </button>

                {/* Expanded controls */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-3 bg-white border-t border-gray-100 flex flex-col gap-4">
                    {bucket.controls.map((ctrl) => (
                      <div key={ctrl.id}>
                        <p className="text-xs font-medium text-gray-500 mb-2">{ctrl.label}</p>
                        <div className="flex flex-wrap gap-2">
                          {ctrl.options.map((opt) => {
                            const selected = isSelected(bucket.id, ctrl.id, opt, ctrl.multi);
                            return (
                              <button
                                key={opt}
                                onClick={() => setControl(bucket.id, ctrl.id, opt, ctrl.multi)}
                                className={cn(
                                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                  selected
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                                )}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky regenerate button */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-gray-100 transition-all duration-200",
        changedCount === 0 ? "opacity-0 pointer-events-none translate-y-2" : "opacity-100 translate-y-0"
      )}>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {isRegenerating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Regenerating…</>
            : `Regenerate plan · ${changedCount} ${changedCount === 1 ? "area" : "areas"} changed`
          }
        </button>
      </div>
    </BottomSheet>
  );
}
