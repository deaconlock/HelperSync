"use client";

import { useState } from "react";
import { Loader2, X, Plus, Sparkles, Home } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { HomeSize } from "@/app/onboarding/employer/page";

// --- Constants ---

const SIZE_OPTIONS: {
  value: HomeSize;
  emoji: string;
  label: string;
  hint: string;
}[] = [
  {
    value: "compact",
    emoji: "🏠",
    label: "Compact",
    hint: "~700 sqft / 65 sqm",
  },
  {
    value: "midsize",
    emoji: "🏡",
    label: "Mid-size",
    hint: "~1,200 sqft / 110 sqm",
  },
  {
    value: "spacious",
    emoji: "🏘️",
    label: "Spacious",
    hint: "1,500+ sqft / 140+ sqm",
  },
];

// --- Component ---

interface Step1Props {
  rooms: string[];
  homeName: string;
  homeDescription: string;
  homeSize: HomeSize;
  onUpdate: (rooms: string[], homeName: string, homeDescription: string, homeSize: HomeSize) => void;
}

export function Step1Household({ rooms, homeName, homeDescription, homeSize, onUpdate }: Step1Props) {
  const [description, setDescription] = useState(homeDescription || "");
  const [localRooms, setLocalRooms] = useState<string[]>(rooms);
  const [localHomeName, setLocalHomeName] = useState(homeName);
  const [localSize, setLocalSize] = useState<HomeSize>(homeSize);
  const [isParsing, setIsParsing] = useState(false);
  const [customRoom, setCustomRoom] = useState("");
  const [hasParsed, setHasParsed] = useState(rooms.length > 0);

  const emit = (r: string[], name: string, desc: string, size: HomeSize) => {
    onUpdate(r, name, desc, size);
  };

  const handleParse = async () => {
    if (!description.trim()) return;
    setIsParsing(true);

    try {
      const res = await fetch("/api/ai/parse-household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();

      if (data.rooms && Array.isArray(data.rooms)) {
        setLocalRooms(data.rooms);
        setHasParsed(true);
        emit(data.rooms, localHomeName, description, localSize);
      } else {
        toast.error("Could not parse rooms. Please try again.");
      }
    } catch {
      toast.error("Failed to connect. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const removeRoom = (room: string) => {
    const updated = localRooms.filter((r) => r !== room);
    setLocalRooms(updated);
    emit(updated, localHomeName, description, localSize);
  };

  const addCustomRoom = () => {
    if (!customRoom.trim()) return;
    const updated = [...localRooms, customRoom.trim()];
    setLocalRooms(updated);
    emit(updated, localHomeName, description, localSize);
    setCustomRoom("");
  };

  const handleSizeChange = (size: HomeSize) => {
    setLocalSize(size);
    emit(localRooms, localHomeName, description, size);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Home className="w-8 h-8 text-gray-700" />
        </div>
        <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-1">
          Describe your home
        </h2>
        <p className="text-text-secondary text-sm max-w-md">
          Tell us about your home in plain words. Our AI will understand.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Home name (optional)
        </label>
        <input
          type="text"
          value={localHomeName}
          onChange={(e) => {
            setLocalHomeName(e.target.value);
            emit(localRooms, e.target.value, description, localSize);
          }}
          placeholder="e.g. The Smith Family Home"
          className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Household description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="e.g. 4-room HDB, master bedroom, 2 common bedrooms, living room, dining area, kitchen, 2 bathrooms, yard"
          className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-colors"
        />
        <p className="mt-1 text-xs text-gray-400">
          Don&apos;t worry about the format — our AI will understand.
        </p>
      </div>

      <button
        onClick={handleParse}
        disabled={isParsing || !description.trim()}
        className={`flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isParsing ? "animate-shimmer bg-gradient-to-r from-gray-800 via-gray-600 to-gray-800 bg-[length:200%_100%]" : ""}`}
      >
        {isParsing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Working on it...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" /> Let&apos;s go
          </>
        )}
      </button>

      {hasParsed && (
        <div className="space-y-6">
          {/* Rooms */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Rooms & Areas</h3>
              <span className="text-sm text-text-muted">{localRooms.length} found</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {localRooms.map((room) => (
                <span
                  key={room}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium"
                >
                  {room}
                  <button
                    onClick={() => removeRoom(room)}
                    className="hover:text-gray-900 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={customRoom}
                onChange={(e) => setCustomRoom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomRoom()}
                placeholder="Add a room..."
                className="flex-1 px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              <button
                onClick={addCustomRoom}
                className="px-3 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Home size */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 text-center">How big is your home?</h3>
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
                    <p className="text-[10px] leading-tight text-gray-400">{opt.hint}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 text-center">
              Helps us estimate how long cleaning tasks take
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
