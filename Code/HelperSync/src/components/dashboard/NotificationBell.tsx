"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { format } from "date-fns";

interface NotificationBellProps {
  householdId: Id<"households">;
}

export function NotificationBell({ householdId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const recentLogs = useQuery(api.taskLogs.getRecentLogs, { householdId });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unread = recentLogs?.filter((log) => {
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    return log.completedAt > tenMinAgo;
  }).length ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-card-hover border border-gray-100 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Recent Completions</h3>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {!recentLogs?.length && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">
                No task completions yet
              </p>
            )}
            {recentLogs?.map((log) => (
              <div
                key={log._id}
                className="px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">✅</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {log.taskName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(log.completedAt, "HH:mm · d MMM")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
