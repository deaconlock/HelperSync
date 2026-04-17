"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  User,
  Settings,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/timetable", icon: CalendarDays, label: "Timetable" },
  { href: "/dashboard/leave", icon: Calendar, label: "Days Off" },
  { href: "/dashboard/helper-profile", icon: User, label: "Helper" },
  { href: "/dashboard/account", icon: Settings, label: "Account" },
];

// Left side: Timetable, Days Off | center +  | Helper, Account
const MOBILE_NAV_LEFT = [
  { href: "/dashboard/timetable", icon: CalendarDays, label: "Timetable" },
  { href: "/dashboard/leave", icon: Calendar, label: "Days Off" },
];

const MOBILE_NAV_RIGHT = [
  { href: "/dashboard/helper-profile", icon: User, label: "Helper" },
  { href: "/dashboard/account", icon: Settings, label: "Account" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex w-56 bg-white border-r border-border flex-col py-4 flex-shrink-0">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-text-secondary hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive ? "text-gray-900" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile bottom tab bar — Instagram-style */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-1px_0_0_rgba(0,0,0,0.07)] flex justify-around items-center px-2 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] z-50">
        {MOBILE_NAV_LEFT.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-4 py-1 transition-colors duration-150"
            >
              <item.icon
                className={cn(
                  "w-6 h-6 transition-colors duration-150",
                  isActive ? "text-gray-900" : "text-gray-400"
                )}
                strokeWidth={isActive ? 2.25 : 1.75}
              />
              <span className={cn(
                "text-[10px] font-medium transition-colors duration-150",
                isActive ? "text-gray-900" : "text-gray-400"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Center + button */}
        <Link
          href="/dashboard/timetable?add=1"
          className="flex items-center justify-center w-12 h-10 rounded-2xl bg-gray-900 transition-transform duration-150 active:scale-95 shadow-sm mx-1"
          aria-label="Add task"
        >
          <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
        </Link>

        {MOBILE_NAV_RIGHT.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-4 py-1 transition-colors duration-150"
            >
              <item.icon
                className={cn(
                  "w-6 h-6 transition-colors duration-150",
                  isActive ? "text-gray-900" : "text-gray-400"
                )}
                strokeWidth={isActive ? 2.25 : 1.75}
              />
              <span className={cn(
                "text-[10px] font-medium transition-colors duration-150",
                isActive ? "text-gray-900" : "text-gray-400"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
