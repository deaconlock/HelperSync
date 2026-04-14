"use client";

import { UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Sparkles, Eye, Moon, Sun } from "lucide-react";
import { HouseholdDoc } from "@/types/household";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { Logo } from "@/components/brand/Logo";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

interface TopNavProps {
  household: HouseholdDoc;
  onAiToggle: () => void;
  aiSidebarOpen: boolean;
}

export function TopNav({ household, onAiToggle, aiSidebarOpen }: TopNavProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-border px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between flex-shrink-0 z-20 sticky top-0">
      <div className="flex items-center gap-2 sm:gap-3">
        <Logo size="sm" href="/dashboard" />
        {household.homeName && (
          <span className="text-xs text-text-muted hidden sm:inline border-l border-border pl-3">{household.homeName}</span>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Helper View toggle */}
        <button
          onClick={() => router.push("/helper")}
          className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 text-sm font-medium text-text-secondary hover:bg-gray-50 rounded-xl transition-colors duration-200"
          title="Helper View"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Helper View</span>
        </button>

        {/* AI assistant toggle */}
        <button
          onClick={onAiToggle}
          className={cn(
            "flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 text-sm font-medium rounded-xl transition-all duration-200",
            aiSidebarOpen
              ? "bg-primary text-white shadow-sm"
              : "text-text-secondary hover:bg-gray-50"
          )}
          title="AI Assistant"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">AI Assistant</span>
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="p-2 text-text-secondary hover:bg-gray-50 rounded-xl transition-colors duration-200"
          aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span className="sr-only">{resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</span>
          {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <NotificationBell householdId={household._id as any} />
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  );
}
