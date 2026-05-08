"use client";

import { useState } from "react";
import { X, Plus, Home, Minus, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomeSize } from "@/app/onboarding/employer/page";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

// --- Constants ---

const PRESET_ROOMS: { label: string; emoji: string }[] = [
  { label: "Master Bedroom", emoji: "🛏️" },
  { label: "Kid's Room", emoji: "🧒" },
  { label: "Guest Room", emoji: "🛌" },
  { label: "Living Room", emoji: "🛋️" },
  { label: "Kitchen", emoji: "🍳" },
  { label: "Dining Area", emoji: "🍽️" },
  { label: "Bathroom", emoji: "🚿" },
  { label: "Helper's Room", emoji: "🛏️" },
  { label: "Laundry Yard", emoji: "👕" },
  { label: "Storeroom", emoji: "📦" },
  { label: "Study / Office", emoji: "📚" },
  { label: "Balcony", emoji: "🌅" },
];


const SIZE_OPTIONS: { value: HomeSize; emoji: string; label: string; hint: string }[] = [
  { value: "compact", emoji: "🏠", label: "Compact", hint: "~700 sqft / 65 sqm" },
  { value: "midsize", emoji: "🏡", label: "Mid-size", hint: "~1,200 sqft / 110 sqm" },
  { value: "spacious", emoji: "🏘️", label: "Spacious", hint: "1,500+ sqft / 140+ sqm" },
];

// --- Helpers ---

// Parse a rooms string[] (possibly containing "Bathroom ×2") back into a count map
function parseRoomsToMap(rooms: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of rooms) {
    const match = r.match(/^(.+?) ×(\d+)$/);
    if (match) {
      map[match[1]] = parseInt(match[2], 10);
    } else {
      map[r] = 1;
    }
  }
  return map;
}

// Serialize count map back to string[] for parent
function mapToRooms(map: Record<string, number>): string[] {
  return Object.entries(map).map(([room, count]) =>
    count > 1 ? `${room} ×${count}` : room
  );
}

// --- Deep clean ---

interface DeepCleanSuggestion { id: string; label: string; frequency: string; rooms: string[]; defaultChecked: boolean; }

const DEEP_CLEAN_SUGGESTIONS: DeepCleanSuggestion[] = [
  { id: "curtains", label: "Curtain washing", frequency: "Every 6 months", rooms: ["living", "bedroom", "dining", "master"], defaultChecked: true },
  { id: "aircon", label: "Aircon filter cleaning", frequency: "Every 3 months", rooms: ["bedroom", "living", "master"], defaultChecked: true },
  { id: "carpet", label: "Carpet / rug shampooing", frequency: "Every 3 months", rooms: ["living", "bedroom", "master"], defaultChecked: false },
  { id: "windows", label: "Window & track cleaning", frequency: "Every 3 months", rooms: ["*"], defaultChecked: false },
  { id: "mattress", label: "Mattress vacuuming", frequency: "Every 6 months", rooms: ["bedroom", "master"], defaultChecked: false },
  { id: "hood", label: "Kitchen hood degreasing", frequency: "Monthly", rooms: ["kitchen"], defaultChecked: true },
  { id: "grout", label: "Bathroom grout scrubbing", frequency: "Monthly", rooms: ["bathroom", "toilet", "shower"], defaultChecked: false },
  { id: "fridge", label: "Fridge deep clean", frequency: "Every 3 months", rooms: ["kitchen"], defaultChecked: true },
  { id: "fan", label: "Ceiling fan cleaning", frequency: "Every 3 months", rooms: ["bedroom", "living", "master"], defaultChecked: false },
  { id: "sofa", label: "Sofa / upholstery vacuuming", frequency: "Every 3 months", rooms: ["living"], defaultChecked: false },
];

export function getDeepCleanSuggestions(rooms: string[]): DeepCleanSuggestion[] {
  const lower = rooms.map((r) => r.toLowerCase());
  return DEEP_CLEAN_SUGGESTIONS.filter((s) =>
    s.rooms.includes("*") || s.rooms.some((kw) => lower.some((r) => r.includes(kw)))
  );
}

export function getDefaultDeepClean(rooms: string[]): string[] {
  return getDeepCleanSuggestions(rooms).filter((s) => s.defaultChecked).map((s) => s.id);
}

// --- Component ---

interface Step1Props {
  rooms: string[];
  homeSize: HomeSize;

  onUpdate: (rooms: string[], homeSize: HomeSize) => void;
  onNext: () => void;
}

export function Step1Household({ rooms, homeSize, onUpdate, onNext }: Step1Props) {
  const [roomMap, setRoomMap] = useState<Record<string, number>>(() => parseRoomsToMap(rooms));
  const [localSize, setLocalSize] = useState<HomeSize>(homeSize);
  const [customRoom, setCustomRoom] = useState("");
  const [substepIdx, setSubstepIdx] = useState<0 | 1>(0);

  const canProceedRooms = Object.keys(roomMap).length > 0;

  const emit = (map: Record<string, number>, size: HomeSize) => {
    onUpdate(mapToRooms(map), size);
  };

  const tapPreset = (room: string) => {
    const next = { ...roomMap };
    if (!next[room]) {
      next[room] = 1;
    } else if (next[room] > 1) {
      next[room] -= 1;
    } else {
      delete next[room];
    }
    setRoomMap(next);
    emit(next, localSize);
  };

  const removeRoom = (room: string) => {
    const next = { ...roomMap };
    delete next[room];
    setRoomMap(next);
    emit(next, localSize);
  };

  const addCustomRoom = () => {
    const trimmed = customRoom.trim();
    if (!trimmed || roomMap[trimmed]) return;
    const next = { ...roomMap, [trimmed]: 1 };
    setRoomMap(next);
    emit(next, localSize);
    setCustomRoom("");
  };

  const handleSizeChange = (size: HomeSize) => {
    setLocalSize(size);
    emit(roomMap, size);
  };

  const allKnownRooms = new Set(PRESET_ROOMS.map((r) => r.label));
  const customRooms = Object.keys(roomMap).filter((r) => !allKnownRooms.has(r));

  if (substepIdx === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Home className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-1">
            How big is your home?
          </h2>
          <p className="text-text-secondary text-sm max-w-md">
            This helps us figure out the right workload. Roughly is fine.
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <p className="text-xs text-gray-400">Bigger homes get more thorough coverage.</p>
            <InfoTooltip content="This helps us get the workload right — bigger homes get more thorough coverage, smaller ones a lighter load." />
          </div>
        </div>

        {/* Size selector */}
        <div className="grid grid-cols-3 gap-2">
          {SIZE_OPTIONS.map((opt) => {
            const isSelected = localSize === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleSizeChange(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 text-center transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-white hover:border-gray-300"
                )}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <p className={cn("font-display font-semibold text-sm", isSelected ? "text-primary" : "text-gray-900")}>{opt.label}</p>
                <p className="text-xs leading-tight text-gray-400">{opt.hint}</p>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="pt-6">
          <button
            onClick={() => setSubstepIdx(1)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base bg-gray-900 text-white hover:bg-gray-800 transition-all duration-200"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Home className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-1">
          Which areas need cleaning?
        </h2>
        <p className="text-text-secondary text-sm max-w-md">
          Think in cleaning zones, not just rooms. If your kitchen and dining share a space, select both.
        </p>
      </div>

      {/* Area picker */}
      <div className="space-y-3">

        {/* Grid sized for 360–430px screens (today's typical mobile range).
            390px iPhone: 358px content → 175px/chip after gap-2.
            px-2.5 padding + w-5 stepper buttons keeps label ≥ 60px on 360px. */}
        <div className="grid grid-cols-2 gap-2 items-stretch">
          {PRESET_ROOMS.map(({ label, emoji }) => {
            const count = roomMap[label] ?? 0;
            const selected = count > 0;
            return (
              <div
                key={label}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-xl border-2 transition-all duration-150",
                  selected ? "border-primary bg-primary/5" : "border-border bg-white",
                )}
              >
                {/* Emoji + label */}
                <span className="text-sm flex-shrink-0">{emoji}</span>
                <span className={cn(
                  "flex-1 min-w-0 text-[10px] font-medium leading-tight",
                  selected ? "text-primary" : "text-gray-700",
                )}>
                  {label}
                </span>

                {/* Stepper — w-5 h-5 to stay compact on small screens */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      if (count === 0) return;
                      const next = { ...roomMap };
                      if (count === 1) delete next[label]; else next[label] = count - 1;
                      setRoomMap(next);
                      emit(next, localSize);
                    }}
                    disabled={count === 0}
                    aria-label={`Remove one ${label}`}
                    className={cn(
                      "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                      count > 0
                        ? "border-primary/40 text-primary hover:bg-primary/10"
                        : "border-gray-200 text-gray-200 cursor-not-allowed",
                    )}
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <span className={cn(
                    "text-[10px] font-semibold w-3.5 text-center tabular-nums",
                    selected ? "text-primary" : "text-gray-300",
                  )}>
                    {count}
                  </span>
                  <button
                    onClick={() => {
                      const next = { ...roomMap, [label]: count + 1 };
                      setRoomMap(next);
                      emit(next, localSize);
                    }}
                    aria-label={`Add one ${label}`}
                    className="w-5 h-5 rounded-full border border-primary/40 text-primary flex items-center justify-center hover:bg-primary/10 transition-colors"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })}
          {/* Custom rooms */}
          {customRooms.map((room) => (
            <span
              key={room}
              className="h-11 flex items-center gap-2 px-3 rounded-xl border-2 border-primary bg-primary/5 text-primary text-sm font-medium relative"
            >
              <span className="text-lg">🏠</span>
              <span className="text-xs leading-tight flex-1">{room}</span>
              <button
                onClick={() => removeRoom(room)}
                className="hover:text-primary/70 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>

        {/* Add custom room */}
        <div className="flex gap-2 pt-1">
          <input
            type="text"
            value={customRoom}
            onChange={(e) => setCustomRoom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomRoom()}
            placeholder="Anything else? e.g. Gym, Prayer Room..."
            className="flex-1 px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
          <button
            onClick={addCustomRoom}
            disabled={!customRoom.trim()}
            className="px-3 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-40 transition-colors"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="pt-6 space-y-3">
        <button
          onClick={onNext}
          disabled={!canProceedRooms}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base transition-all duration-200",
            canProceedRooms
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setSubstepIdx(0)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
    </div>
  );
}
