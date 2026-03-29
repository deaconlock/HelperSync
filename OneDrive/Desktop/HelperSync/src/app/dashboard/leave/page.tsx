"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { useState } from "react";
import { toISODate, cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { LeaveSkeleton } from "@/components/ui/Skeleton";

const DAY_TYPE_COLORS: Record<string, string> = {
  RestDay: "bg-blue-100 text-blue-700",
  PublicHoliday: "bg-red-100 text-red-700",
  Leave: "bg-amber-100 text-amber-700",
};

const DAY_TYPE_LABELS: Record<string, string> = {
  RestDay: "Rest Day",
  PublicHoliday: "Public Holiday",
  Leave: "Leave",
};

export default function LeavePage() {
  const household = useQuery(api.households.getMyHousehold);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"RestDay" | "PublicHoliday" | "Leave">("RestDay");
  const [note, setNote] = useState("");

  const daysOff = useQuery(
    api.daysOff.getDaysOff,
    household ? { householdId: household._id } : "skip"
  );
  const addDayOff = useMutation(api.daysOff.addDayOff);
  const removeDayOff = useMutation(api.daysOff.removeDayOff);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add empty cells for day offset
  const startDayOfWeek = getDay(monthStart); // 0=Sun

  const getDayOff = (date: Date) => {
    const iso = toISODate(date);
    return daysOff?.find((d) => d.date === iso);
  };

  const handleDayClick = (date: Date) => {
    const iso = toISODate(date);
    const existing = getDayOff(date);
    if (existing) {
      setSelectedDate(iso);
      setSelectedType(existing.type);
      setNote(existing.note ?? "");
    } else {
      setSelectedDate(iso);
      setSelectedType("RestDay");
      setNote("");
    }
  };

  const handleSave = async () => {
    if (!household || !selectedDate) return;
    try {
      await addDayOff({
        householdId: household._id,
        date: selectedDate,
        type: selectedType,
        note: note || undefined,
      });
      toast.success("Day off saved!");
      setSelectedDate(null);
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleRemove = async () => {
    if (!household || !selectedDate) return;
    try {
      await removeDayOff({ householdId: household._id, date: selectedDate });
      toast.success("Day off removed");
      setSelectedDate(null);
    } catch {
      toast.error("Failed to remove");
    }
  };

  if (!household) return <LeaveSkeleton />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      <h1 className="text-2xl font-display font-semibold tracking-tight text-gray-900">Helper Days Off</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-medium text-gray-900">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded-xl"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((day) => {
              const dayOff = getDayOff(day);
              const iso = toISODate(day);
              const isSelected = selectedDate === iso;
              return (
                <button
                  key={iso}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "h-9 w-full rounded-xl text-sm font-medium transition-colors relative",
                    isSelected ? "ring-2 ring-primary" : "",
                    dayOff ? DAY_TYPE_COLORS[dayOff.type] : "hover:bg-gray-100 text-gray-700"
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex gap-4">
            {Object.entries(DAY_TYPE_LABELS).map(([type, label]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={cn("w-3 h-3 rounded-sm", DAY_TYPE_COLORS[type])} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Add/edit panel */}
          {selectedDate ? (
            <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
              <h3 className="font-medium text-gray-900">
                {format(new Date(selectedDate + "T00:00:00"), "d MMMM yyyy")}
              </h3>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as typeof selectedType)}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-colors"
                >
                  <option value="RestDay">Rest Day</option>
                  <option value="PublicHoliday">Public Holiday</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Doctor's appointment"
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
              <div className="flex gap-2">
                {getDayOff(new Date(selectedDate + "T00:00:00")) && (
                  <button
                    onClick={handleRemove}
                    className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors duration-200"
                  >
                    Remove
                  </button>
                )}
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-700 transition-colors duration-200"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-border p-5">
              <p className="text-sm text-text-muted text-center">
                Click a day on the calendar to mark it as a day off.
              </p>
            </div>
          )}

          {/* Upcoming days off */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="font-medium text-gray-900 mb-3">Upcoming Days Off</h3>
            {!daysOff?.length ? (
              <p className="text-sm text-text-muted">No days off scheduled.</p>
            ) : (
              <div className="space-y-2">
                {daysOff
                  .filter((d) => d.date >= toISODate(new Date()))
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .slice(0, 8)
                  .map((d) => (
                    <div key={d._id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        {format(new Date(d.date + "T00:00:00"), "d MMM")}
                      </span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-lg", DAY_TYPE_COLORS[d.type])}>
                        {DAY_TYPE_LABELS[d.type]}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
