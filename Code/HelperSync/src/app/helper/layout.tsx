"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { HelperTopBar } from "@/components/layout/HelperTopBar";
import type { Language } from "@/lib/i18n";

export default function HelperLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useQuery(api.helperSessions.getMySession);
  const household = useQuery(api.households.getMyHousehold);

  // Employer previewing helper view — allow access
  const isEmployerPreview = session === null && household !== undefined && household !== null;

  useEffect(() => {
    // Only redirect if neither a helper session nor an employer household exists
    if (session === null && household === null) {
      router.replace("/onboarding");
    }
  }, [session, household, router]);

  if (!session && !isEmployerPreview) return null;

  const language = session?.language ?? household?.helperDetails?.language ?? "en";

  return (
    <LanguageProvider initialLanguage={(language as Language) ?? "en"}>
      <div className="min-h-screen bg-background font-helper">
        <HelperTopBar showBackToDashboard={isEmployerPreview} />
        <main className="max-w-2xl mx-auto px-4 pb-8">{children}</main>
      </div>
    </LanguageProvider>
  );
}
