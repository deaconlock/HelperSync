"use client";

import { cn } from "@/lib/utils";
import { addDays, format, isSameDay } from "date-fns";

interface DateItem {
  date: Date;
  dayName: string;
  dateNum: string;
  month: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

function getDateWindow(today: Date): DateItem[] {
  const items: DateItem[] = [];
  for (let offset = -2; offset <= 2; offset++) {
    const date = addDays(today, offset);
    items.push({
      date,
      dayName: format(date, "EEE"),
      dateNum: format(date, "d"),
      month: format(date, "MMM"),
      isToday: offset === 0,
      isPast: offset < 0,
      isFuture: offset > 0,
    });
  }
  return items;
}

interface DaySelectorStripProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  completionMap?: Record<string, { done: number; total: number }>;
}

export function DaySelectorStrip({ selectedDate, onSelect, completionMap }: DaySelectorStripProps) {
  const today = new Date();
  const dates = getDateWindow(today);

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {dates.map((item) => {
        const isSelected = isSameDay(selectedDate, item.date);
        const dateKey = format(item.date, "yyyy-MM-dd");
        const completion = completionMap?.[dateKey];

        return (
          <button
            key={dateKey}
            onClick={() => onSelect(item.date)}
            className={cn(
              "flex-1 min-w-[64px] flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-2xl text-xs font-medium transition-all duration-200",
              isSelected
                ? "bg-gray-900 text-white shadow-sm scale-105"
                : item.isToday
                  ? "bg-white text-gray-900 ring-1 ring-gray-200 shadow-sm"
                  : item.isPast
                    ? "bg-gray-50 text-text-muted border border-transparent"
                    : "bg-white text-text-secondary border border-border",
            )}
          >
            {/* Day name */}
            <span className={cn(
              "text-[10px] uppercase tracking-wide",
              isSelected ? "text-white/80" : "text-text-muted"
            )}>
              {item.dayName}
            </span>

            {/* Date number */}
            <span className={cn(
              "text-lg font-semibold leading-none",
              isSelected ? "text-white" : item.isToday ? "text-gray-900" : item.isPast ? "text-text-muted" : "text-gray-700"
            )}>
              {item.dateNum}
            </span>

            {/* Month */}
            <span className={cn(
              "text-[10px]",
              isSelected ? "text-white/70" : "text-text-muted"
            )}>
              {item.month}
            </span>

            {/* Completion indicator for past/today */}
            {completion && (completion.done > 0 || item.isPast || item.isToday) && (
              <div className={cn(
                "mt-0.5 text-[9px] font-semibold rounded-full px-1.5 py-0.5 leading-none",
                isSelected
                  ? "bg-white/20 text-white"
                  : completion.done === completion.total && completion.total > 0
                    ? "bg-green-50 text-green-600"
                    : "bg-gray-100 text-text-muted"
              )}>
                {completion.done}/{completion.total}
              </div>
            )}

            {/* Today dot */}
            {item.isToday && !isSelected && (
              <div className="w-1.5 h-1.5 rounded-full bg-gray-900 mt-0.5" />
            )}
          </button>
        );
      })}
    </div>
  );
}
