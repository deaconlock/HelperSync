"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useCallback, useState } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { AiSidebar } from "@/components/layout/AiSidebar";
import { AiProvider, useAi } from "@/lib/ai-context";
import { PullToRefresh } from "@/components/ui/PullToRefresh";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const household = useQuery(api.households.getMyHousehold);
  const { isOpen, initialPrompt, toggleAi, closeAi, consumePrompt } = useAi();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleRefresh = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 600));
  }, []);

  useEffect(() => {
    if (household === null) {
      router.replace("/onboarding");
    }
  }, [household, router]);

  if (!household) return null;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TopNav
        household={household}
        onAiToggle={toggleAi}
        aiSidebarOpen={isOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        <SidebarNav />
        {isMobile ? (
          <PullToRefresh onRefresh={handleRefresh}>
            <div className="p-3 pb-20">{children}</div>
          </PullToRefresh>
        ) : (
          <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-6">{children}</main>
        )}
        <AiSidebar
          isOpen={isOpen}
          onClose={closeAi}
          householdId={household._id}
          initialPrompt={initialPrompt}
          onInitialPromptConsumed={consumePrompt}
        />
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AiProvider>
      <DashboardInner>{children}</DashboardInner>
    </AiProvider>
  );
}
