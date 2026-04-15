"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useCallback, useState } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { AiSidebar } from "@/components/layout/AiSidebar";
import { TrialBanner } from "@/components/layout/TrialBanner";
import { PaymentWallModal } from "@/components/layout/PaymentWallModal";
import { DevTrialSimulator } from "@/components/layout/DevTrialSimulator";
import { AiProvider, useAi } from "@/lib/ai-context";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { getTrialPhase, getDaysRemaining } from "@/lib/subscription";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const household = useQuery(api.households.getMyHousehold);
  const subscription = useQuery(
    api.subscriptions.getSubscription,
    household ? { householdId: household._id } : "skip"
  );
  const { isOpen, initialPrompt, toggleAi, closeAi, consumePrompt } = useAi();
  const [isMobile, setIsMobile] = useState(false);
  const [showPaymentWall, setShowPaymentWall] = useState(false);

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

  // Subscription gating
  const phase = getTrialPhase(subscription);

  useEffect(() => {
    if (phase === "loading") return; // still loading, don't redirect
    if (phase === "expired" || phase === "canceled") {
      router.replace("/subscribe");
    }
    // Payment wall modal is triggered by clicking "Add payment →" in TrialBanner, not auto-shown
  }, [phase, router]);

  if (!household || phase === "loading") return null;

  const daysLeft = subscription ? getDaysRemaining(subscription) : 0;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TrialBanner
        householdId={household._id}
        onUpgradeClick={() => setShowPaymentWall(true)}
      />
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

      {/* Payment wall modal (day 7+, no payment yet) */}
      {showPaymentWall && phase === "payment-wall" && (
        <PaymentWallModal householdId={household._id} daysLeft={daysLeft} />
      )}

      {/* Dev trial simulator */}
      <DevTrialSimulator householdId={household._id} />
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
