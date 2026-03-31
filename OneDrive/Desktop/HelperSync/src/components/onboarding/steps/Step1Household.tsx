"use client";

import { useState } from "react";
import { X, Plus, Home, Check, Minus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomeSize, SetupFor, Priority } from "@/app/onboarding/employer/page";

// --- Constants ---

// Combo chips — selecting one blocks its constituent rooms
const COMBO_ROOMS: { label: string; blocks: string[] }[] = [
  { label: "Kitchen + Dining (open-plan)", blocks: ["Kitchen", "Dining Area"] },
  { label: "Living + Dining (open-plan)", blocks: ["Living Room", "Dining Area"] },
];

const PRESET_ROOMS = [
  "Master Bedroom",
  "Common Bedroom",
  "Living Room",
  "Kitchen",
  "Dining Area",
  "Bathroom",
  "Helper's Room",
  "Yard / Service Area",
  "Store Room",
  "Study Room",
  "Balcony",
];

// Rooms where having multiples makes sense
const COUNTABLE_ROOMS = new Set([
  "Common Bedroom",
  "Bathroom",
  "Dining Area",
  "Balcony",
  "Study Room",
]);

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

function getDeepCleanSuggestions(rooms: string[]): DeepCleanSuggestion[] {
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
  homeName: string;
  homeDescription: string;
  homeSize: HomeSize;
  setupFor: SetupFor | null;
  householdFocus: Priority[];
  deepCleanTasks: string[];
  onUpdate: (rooms: string[], homeName: string, homeDescription: string, homeSize: HomeSize) => void;
  onDeepCleanUpdate: (tasks: string[]) => void;
}

export function Step1Household({ rooms, homeName, homeSize, setupFor, householdFocus, deepCleanTasks, onUpdate, onDeepCleanUpdate }: Step1Props) {
  const [roomMap, setRoomMap] = useState<Record<string, number>>(() => parseRoomsToMap(rooms));
  const [localHomeName, setLocalHomeName] = useState(homeName);
  const [localSize, setLocalSize] = useState<HomeSize>(homeSize);
  const [customRoom, setCustomRoom] = useState("");
  const [localDeepClean, setLocalDeepClean] = useState<string[]>(deepCleanTasks);
  const [deepCleanOpen, setDeepCleanOpen] = useState(deepCleanTasks.length > 0);

  const isOwn = setupFor !== "family";

  const emit = (map: Record<string, number>, name: string, size: HomeSize) => {
    onUpdate(mapToRooms(map), name, "", size);
  };

  const tapPreset = (room: string) => {
    const next = { ...roomMap };
    if (!next[room]) {
      next[room] = 1;
    } else if (COUNTABLE_ROOMS.has(room) && next[room] > 1) {
      // Minus button on stepper — decrement
      next[room] -= 1;
    } else {
      // Non-countable toggle, or countable hitting 0 → deselect
      delete next[room];
    }
    setRoomMap(next);
    emit(next, localHomeName, localSize);
  };

  const removeRoom = (room: string) => {
    const next = { ...roomMap };
    delete next[room];
    setRoomMap(next);
    emit(next, localHomeName, localSize);
  };

  const addCustomRoom = () => {
    const trimmed = customRoom.trim();
    if (!trimmed || roomMap[trimmed]) return;
    const next = { ...roomMap, [trimmed]: 1 };
    setRoomMap(next);
    emit(next, localHomeName, localSize);
    setCustomRoom("");
  };

  const handleSizeChange = (size: HomeSize) => {
    setLocalSize(size);
    emit(roomMap, localHomeName, size);
  };

  // Which individual rooms are blocked by a selected combo
  const blockedRooms = new Set(
    COMBO_ROOMS.filter((c) => roomMap[c.label]).flatMap((c) => c.blocks)
  );

  const toggleCombo = (label: string, blocks: string[]) => {
    const next = { ...roomMap };
    if (next[label]) {
      // Deselect combo
      delete next[label];
    } else {
      // Select combo — remove any individually selected constituent rooms
      next[label] = 1;
      blocks.forEach((b) => delete next[b]);
    }
    setRoomMap(next);
    emit(next, localHomeName, localSize);
  };

  const allKnownRooms = new Set([...PRESET_ROOMS, ...COMBO_ROOMS.map((c) => c.label)]);
  const customRooms = Object.keys(roomMap).filter((r) => !allKnownRooms.has(r));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Home className="w-8 h-8 text-gray-700" />
        </div>
        <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-1">
          {isOwn ? "Your home, your helper's workplace" : "The home, their workplace"}
        </h2>
        <p className="text-text-secondary text-sm max-w-md">
          Select the rooms and areas — we&apos;ll build the schedule around them.
        </p>
      </div>

      {/* Home name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Home name <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={localHomeName}
          onChange={(e) => {
            setLocalHomeName(e.target.value);
            emit(roomMap, e.target.value, localSize);
          }}
          placeholder={isOwn ? "e.g. The Smith Family Home" : "e.g. Mum & Dad's Place"}
          className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>

      {/* Room picker */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            What rooms does {isOwn ? "your home" : "the home"} have?
          </label>
        </div>

        {/* Combo chips */}
        <div className="flex flex-wrap gap-2">
          {COMBO_ROOMS.map(({ label, blocks }) => {
            const selected = !!roomMap[label];
            return (
              <button
                key={label}
                onClick={() => toggleCombo(label, blocks)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 text-sm font-medium transition-all duration-150",
                  selected
                    ? "border-primary bg-primary-50 text-primary"
                    : "border-dashed border-gray-300 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-700"
                )}
              >
                {selected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_ROOMS.map((room) => {
            const count = roomMap[room] ?? 0;
            const selected = count > 0;
            const countable = COUNTABLE_ROOMS.has(room);
            const blocked = blockedRooms.has(room);
            return (
              <div key={room} className="flex items-center">
                {selected && countable ? (
                  // Inline stepper for countable selected rooms
                  <div className="flex items-center border-2 border-primary bg-primary-50 rounded-xl overflow-hidden text-sm font-medium text-primary">
                    <button
                      onClick={() => tapPreset(room)}
                      className="px-2.5 py-2 hover:bg-primary/10 transition-colors"
                      aria-label={`Remove one ${room}`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-1 min-w-[4rem] text-center select-none">
                      {room} {count > 1 && <span className="font-semibold">×{count}</span>}
                    </span>
                    <button
                      onClick={() => {
                        const next = { ...roomMap, [room]: count + 1 };
                        setRoomMap(next);
                        emit(next, localHomeName, localSize);
                      }}
                      className="px-2.5 py-2 hover:bg-primary/10 transition-colors"
                      aria-label={`Add one more ${room}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  // Standard toggle chip
                  <button
                    onClick={() => !blocked && tapPreset(room)}
                    disabled={blocked}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 text-sm font-medium transition-all duration-150",
                      blocked
                        ? "border-border bg-gray-50 text-gray-300 cursor-not-allowed"
                        : selected
                          ? "border-primary bg-primary-50 text-primary"
                          : "border-border bg-white text-gray-700 hover:border-gray-300"
                    )}
                  >
                    {selected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                    {room}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom rooms */}
        {customRooms.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {customRooms.map((room) => (
              <span
                key={room}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-primary bg-primary-50 text-primary text-sm font-medium"
              >
                <Check className="w-3.5 h-3.5 flex-shrink-0" />
                {room}
                <button
                  onClick={() => removeRoom(room)}
                  className="ml-0.5 hover:text-primary/70 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add custom room */}
        <div className="flex gap-2 pt-1">
          <input
            type="text"
            value={customRoom}
            onChange={(e) => setCustomRoom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomRoom()}
            placeholder="Add another room..."
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

      {/* Home size */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">
          How big is {isOwn ? "your home" : "the home"}?
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {SIZE_OPTIONS.map((opt) => {
            const isSelected = localSize === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleSizeChange(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-4 rounded-2xl border text-center transition-all duration-200",
                  isSelected
                    ? "border-gray-900 bg-gray-50 shadow-sm"
                    : "border-border bg-white hover:border-gray-300"
                )}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <p className="font-display font-semibold text-sm text-gray-900">{opt.label}</p>
                <p className="text-xs leading-tight text-gray-400">{opt.hint}</p>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 text-center">
          Helps us estimate how long cleaning tasks take
        </p>
      </div>

      {/* Deep clean — only when cleanliness is a priority and rooms are selected */}
      {householdFocus.includes("cleanliness") && Object.keys(roomMap).length > 0 && (() => {
        const suggestions = getDeepCleanSuggestions(mapToRooms(roomMap));
        if (suggestions.length === 0) return null;
        const toggleDeepClean = (id: string) => {
          const updated = localDeepClean.includes(id)
            ? localDeepClean.filter((x) => x !== id)
            : [...localDeepClean, id];
          setLocalDeepClean(updated);
          onDeepCleanUpdate(updated);
        };
        return (
          <div className="space-y-2 border-t border-border pt-6">
            <button
              onClick={() => setDeepCleanOpen(!deepCleanOpen)}
              className="flex items-center gap-2 w-full text-left"
            >
              <span className="text-base">🧽</span>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 text-sm">Periodic deep cleaning</h3>
                <p className="text-xs text-gray-400">Tasks most people forget — we&apos;ll rotate them into the weekly schedule</p>
              </div>
              {localDeepClean.length > 0 && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {localDeepClean.length}
                </span>
              )}
              <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-200", deepCleanOpen && "rotate-180")} />
            </button>
            {deepCleanOpen && (
              <div className="space-y-1 pt-1">
                {suggestions.map((s) => {
                  const isChecked = localDeepClean.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleDeepClean(s.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-150",
                        isChecked ? "border-gray-300 bg-gray-50" : "border-transparent bg-white hover:bg-gray-50"
                      )}
                    >
                      <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors", isChecked ? "bg-gray-900 border-gray-900" : "border-gray-300")}>
                        {isChecked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <p className="flex-1 text-sm text-gray-900">{s.label}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0">{s.frequency}</span>
                    </button>
                  );
                })}
                <p className="text-xs text-gray-400 pt-1">Frequencies can be adjusted anytime in your timetable</p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
