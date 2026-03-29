"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  User,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/timetable", icon: CalendarDays, label: "Timetable" },
  { href: "/dashboard/leave", icon: Calendar, label: "Days Off" },
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

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border flex justify-around items-center py-2 pb-[env(safe-area-inset-bottom,8px)] z-50">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-medium transition-colors duration-200 min-w-[60px]",
                isActive
                  ? "text-gray-900"
                  : "text-text-muted"
              )}
            >
              {/* Active indicator pill */}
              {isActive && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-1 bg-gray-900 rounded-full" />
              )}
              <item.icon className={cn("w-5 h-5", isActive && "text-gray-900")} />
              <span className={cn(isActive && "font-semibold")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
