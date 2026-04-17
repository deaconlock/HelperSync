"use client";

import { useState, useEffect } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { FirstRunModal } from "@/components/dashboard/FirstRunModal";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { DashboardSkeleton } from "@/components/ui/Skeleton";

export default function DashboardPage() {
  const { track } = useAnalytics();
  useEffect(() => { track("dashboard_visited", {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [showFirstRun, setShowFirstRun] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("helpersync-first-run-seen")) {
      setShowFirstRun(true);
    }
  }, []);
  const dismissFirstRun = () => {
    localStorage.setItem("helpersync-first-run-seen", "1");
    setShowFirstRun(false);
  };

  const household = useQuery(api.households.getMyHousehold);

  if (!household) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      {showFirstRun && <FirstRunModal onDismiss={dismissFirstRun} />}
      <DashboardView householdId={household._id} />
    </>
  );
}
