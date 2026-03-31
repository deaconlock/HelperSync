"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Loader2 } from "lucide-react";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { Step0Qualification } from "@/components/onboarding/steps/Step0Qualification";
import { Step1Household } from "@/components/onboarding/steps/Step1Household";
import { Step2Members } from "@/components/onboarding/steps/Step2Members";
import { Step4DailyLife } from "@/components/onboarding/steps/Step4DailyLife";
import { Step5Experience } from "@/components/onboarding/steps/Step5Experience";
import { Step7HelperDetails } from "@/components/onboarding/steps/Step7HelperDetails";
import { Step8Review } from "@/components/onboarding/steps/Step8Review";
import { Step9ScheduleReview } from "@/components/onboarding/steps/Step9ScheduleReview";
import { StepSignUp } from "@/components/onboarding/steps/StepSignUp";
import { createInviteData } from "@/lib/invite";
import { PersonaCard } from "@/components/onboarding/PersonaCard";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { HouseholdMember, HelperDetails } from "@/types/household";
import { DayAvailability } from "@/types/schedule";
import { DayTasks } from "@/types/timetable";

export type Priority =
  | "meals"
  | "cleanliness"
  | "childcare"
  | "elderlycare"
  | "laundry"
  | "grocery"
  | "organizing";

export type HelperExperience = "new" | "some" | "experienced";
export type HelperPace = "relaxed" | "balanced" | "intensive";
export type HomeSize = "compact" | "midsize" | "spacious";

export type SetupFor = "own" | "family";

export interface WizardData {
  // Qualifying questions (Step 1)
  setupFor: SetupFor | null;
  firstTimeEmployer: boolean | null;
  householdFocus: Priority[];
  helperHasPhone: boolean | null;
  homeName: string;
  homeDescription: string;
  homeSize: HomeSize;
  rooms: string[];
  deepCleanTasks: string[];
  members: HouseholdMember[];
  priorities: Priority[];
  routines: string; // kept for backward compat with localStorage
  memberRoutines: Record<string, string>;
  memberSchedules: Record<string, DayAvailability>;
  memberQuietHours: Record<string, string>;
  helperExperience: HelperExperience | null;
  helperPace: HelperPace;
  employerAvailability: DayAvailability | null; // derived from memberSchedules for Convex
  wifeAvailability: DayAvailability | null; // derived from memberSchedules for Convex
  helperDetails: HelperDetails | null;
  inviteCode: string;
  inviteQrData: string;
  weeklyTasks: DayTasks[] | null;
}

const emptyAvailability: DayAvailability = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

const initialData: WizardData = {
  setupFor: null,
  firstTimeEmployer: null,
  householdFocus: [],
  helperHasPhone: null,
  homeName: "",
  homeDescription: "",
  homeSize: "midsize",
  rooms: [],
  deepCleanTasks: [],
  members: [],
  priorities: [],
  routines: "",
  memberRoutines: {},
  memberSchedules: {},
  memberQuietHours: {},
  helperExperience: null,
  helperPace: "balanced",
  employerAvailability: null,
  wifeAvailability: null,
  helperDetails: null,
  inviteCode: "",
  inviteQrData: "",
  weeklyTasks: null,
};

const TOTAL_STEPS = 9;

function EmployerOnboardingPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const isConvexAuthed = isAuthenticated ?? false;
  const searchParams = useSearchParams();
  const createHousehold = useMutation(api.households.createHousehold);
  const setTimetable = useMutation(api.timetable.setTimetable);
  const setSchedule = useMutation(api.schedules.setSchedule);

  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [hydrated, setHydrated] = useState(false);
  const [showPersonaCard, setShowPersonaCard] = useState(false);
  const [showStep4Reward, setShowStep4Reward] = useState(false);
  const [seg1Result, setSeg1Result] = useState<DayTasks[] | null>(null);
  const [seg2Result, setSeg2Result] = useState<DayTasks[] | null>(null);
  const [seg3Result, setSeg3Result] = useState<DayTasks[] | null>(null);
  const [seg1Error, setSeg1Error] = useState(false);
  const [seg23Error, setSeg23Error] = useState(false);
  const [completingRef] = useState({ called: false });
  const seg23TimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  const mergeSegmentDays = useCallback((newDays: DayTasks[]) => {
    setData((prev) => {
      const existing = (prev.weeklyTasks ?? []).filter(
        (d) => !newDays.find((n) => n.day === d.day)
      );
      const merged = [...existing, ...newDays].sort(
        (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
      );
      const next = { ...prev, weeklyTasks: merged };
      if (typeof window !== "undefined") {
        localStorage.setItem("helpersync-wizard", JSON.stringify(next));
      }
      return next;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore saved wizard state and step after hydration to avoid SSR mismatch
  useEffect(() => {
    const saved = localStorage.getItem("helpersync-wizard");
    if (saved) {
      try {
        setData((prev) => ({ ...prev, ...JSON.parse(saved) }));
      } catch {
        // ignore
      }
    }
    const savedStep = localStorage.getItem("helpersync-wizard-step");
    if (savedStep) {
      const parsed = parseInt(savedStep, 10);
      if (parsed >= 1 && parsed <= 9) setStep(parsed);
    }
    setHydrated(true);
  }, []);

  // Clear seg23 timeout when both segments arrive
  useEffect(() => {
    if (seg2Result && seg3Result) {
      if (seg23TimeoutRef.current) clearTimeout(seg23TimeoutRef.current);
    }
  }, [seg2Result, seg3Result]);

  // Handle OAuth redirect or returning signed-in user:
  // wait for Clerk + Convex auth + hydration, then flush localStorage to Convex
  useEffect(() => {
    if (!hydrated || completingRef.called) return;
    if (searchParams.get("completing") !== "true") return;
    if (!isSignedIn || !isConvexAuthed) return;

    completingRef.called = true;
    handleComplete();
  }, [hydrated, isSignedIn, isConvexAuthed, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => {
      const next = { ...prev, ...updates };
      if (typeof window !== "undefined") {
        localStorage.setItem("helpersync-wizard", JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const goToStep = (s: number) => {
    setStep(s);
    localStorage.setItem("helpersync-wizard-step", String(s));
  };

  const triggerSegment = useCallback(async (
    d: WizardData,
    days: string[],
    onResult: (tasks: DayTasks[]) => void,
    onError: () => void,
  ) => {
    try {
      const res = await fetch("/api/ai/generate-timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeName: d.homeName,
          rooms: d.rooms,
          members: d.members,
          helperDetails: d.helperDetails,
          memberRoutines: d.memberRoutines,
          memberQuietHours: d.memberQuietHours,
          priorities: d.priorities,
          helperExperience: d.helperExperience,
          helperPace: d.helperPace,
          homeSize: d.homeSize,
          deepCleanTasks: d.deepCleanTasks,
          daysToGenerate: days,
        }),
      });
      if (!res.ok || !res.body) { onError(); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }

      const trimmed = accumulated.trim();
      const arrMatch = trimmed.match(/\[[\s\S]*\]/);
      if (!arrMatch) { onError(); return; }
      const rawTasks: DayTasks[] = JSON.parse(arrMatch[0]);

      const parsed = rawTasks;
      if (Array.isArray(parsed) && parsed[0]?.day && parsed[0]?.tasks) {
        const result = parsed.map((dayObj: DayTasks) => ({
          ...dayObj,
          tasks: dayObj.tasks.map((t) => ({
            ...t,
            recurring: t.recurring ?? (t.category !== "Break" && t.category !== "Errands"),
            requiresPhoto: t.requiresPhoto ?? ["Elderly Care", "Baby Care"].includes(t.category),
          })),
        }));
        onResult(result);
      } else {
        onError();
      }
    } catch {
      onError();
    }
  }, []);

  const handleNext = () => {
    if (step === 1) {
      setShowPersonaCard(true);
      return;
    }
    if (step === 6) {
      // Segment 1: Mon/Tue/Wed — fires while user reads portrait cards on step 7
      setSeg1Result(null);
      setSeg1Error(false);
      triggerSegment(data, ["monday", "tuesday", "wednesday"], setSeg1Result, () => setSeg1Error(true));
    }
    if (step === 7) {
      // Segments 2+3 fire simultaneously as user enters the schedule editor
      setSeg2Result(null);
      setSeg3Result(null);
      setSeg23Error(false);
      triggerSegment(data, ["thursday", "friday", "saturday"], setSeg2Result, () => setSeg23Error(true));
      triggerSegment(data, ["sunday"], setSeg3Result, () => setSeg23Error(true));
      // Fallback: if segments don't arrive in 90s, show error + retry
      if (seg23TimeoutRef.current) clearTimeout(seg23TimeoutRef.current);
      seg23TimeoutRef.current = setTimeout(() => setSeg23Error(true), 90000);
    }
    goToStep(Math.min(step + 1, TOTAL_STEPS));
  };
  const handleBack = () => goToStep(Math.max(step - 1, 1));
  const handleStepClick = (targetStep: number) => {
    if (targetStep < step) goToStep(targetStep);
  };

  const handleComplete = async () => {
    // Use current state, or fall back to localStorage (needed for OAuth redirect
    // where state may not have updated yet in this render cycle)
    let d = data;
    if (!d.weeklyTasks || !d.helperDetails) {
      try {
        const saved = localStorage.getItem("helpersync-wizard");
        if (saved) d = { ...initialData, ...JSON.parse(saved) };
      } catch { /* ignore */ }
    }
    if (!d.weeklyTasks || !d.helperDetails) return;

    const { code, url } = d.inviteCode
      ? { code: d.inviteCode, url: d.inviteQrData }
      : createInviteData();

    try {
      const householdId = await createHousehold({
        homeName: d.homeName || "My Household",
        rooms: d.rooms,
        members: d.members,
        helperDetails: d.helperDetails!,
        inviteCode: code,
        inviteQrData: url,
      });

      await setTimetable({
        householdId,
        weeklyTasks: d.weeklyTasks as Parameters<typeof setTimetable>[0]["weeklyTasks"],
      });

      // Derive employer/partner availability from memberSchedules for Convex
      const employerAv = d.memberSchedules["employer"] ?? d.employerAvailability;
      const partnerKey = Object.keys(d.memberSchedules).find((k) => k !== "employer");
      const partnerAv = partnerKey ? d.memberSchedules[partnerKey] : d.wifeAvailability;
      if (employerAv) {
        await setSchedule({
          householdId,
          employerAvailability: employerAv,
          wifeAvailability: partnerAv ?? emptyAvailability,
        });
      }

      localStorage.removeItem("helpersync-wizard");
      localStorage.removeItem("helpersync-wizard-step");
      toast.success("Household set up successfully!");
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save household. Please try again.");
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return (
        data.setupFor !== null &&
        data.firstTimeEmployer !== null &&
        data.householdFocus.length >= 1 &&
        data.helperHasPhone !== null
      );
      case 2: return data.rooms.length > 0;
      case 3: return data.members.length > 0;
      case 4: return true; // daily life is optional
      case 5: return data.helperExperience !== null;
      case 6: return data.helperDetails !== null && (data.inviteCode !== "" || data.helperHasPhone === false);
      case 7: return data.weeklyTasks !== null;
      case 8: return (data.weeklyTasks?.length ?? 0) >= 7;
      case 9: return true;
      default: return false;
    }
  };

  // Show loading screen while completing OAuth flow (prevents wizard flash)
  if (searchParams.get("completing") === "true") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <p className="text-sm text-text-muted">Setting up your household...</p>
      </div>
    );
  }

  if (showPersonaCard) {
    return (
      <PersonaCard
        setupFor={data.setupFor}
        householdFocus={data.householdFocus}
        firstTimeEmployer={data.firstTimeEmployer}
        onContinue={() => {
          setShowPersonaCard(false);
          goToStep(2);
        }}
      />
    );
  }

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL_STEPS}
      onStepClick={handleStepClick}
      stepLabels={[
        "About You",
        "Your Home",
        "Your Household",
        "Daily Life",
        "Your Helper",
        "Helper Details",
        "Build Schedule",
        "Review Schedule",
        "Confirm",
      ]}
      onNext={step === 4
        ? () => {
            const hasRoutines = Object.values(data.memberRoutines).some((v) => v?.trim());
            if (hasRoutines) {
              setShowStep4Reward(true);
            } else {
              goToStep(5);
            }
          }
        : handleNext
      }
      onBack={handleBack}
      canProceed={canProceed()}
      isLastStep={step === TOTAL_STEPS}
      wide={step === 8}
      hideFooter={step === 8 || step === 9}
    >
      {step === 1 && (
        <Step0Qualification
          data={{
            setupFor: data.setupFor,
            firstTimeEmployer: data.firstTimeEmployer,
            householdFocus: data.householdFocus,
            helperHasPhone: data.helperHasPhone,
          }}
          onUpdate={(updates) => {
            updateData(updates);
          }}
        />
      )}
      {step === 2 && (
        <Step1Household
          rooms={data.rooms}
          homeName={data.homeName}
          homeDescription={data.homeDescription}
          homeSize={data.homeSize}
          setupFor={data.setupFor}
          householdFocus={data.householdFocus}
          deepCleanTasks={data.deepCleanTasks}
          onUpdate={(rooms, homeName, homeDescription, homeSize) =>
            updateData({ rooms, homeName, homeDescription, homeSize })
          }
          onDeepCleanUpdate={(deepCleanTasks) => updateData({ deepCleanTasks })}
        />
      )}
      {step === 3 && (
        <Step2Members
          members={data.members}
          setupFor={data.setupFor}
          onUpdate={(members) => updateData({ members })}
        />
      )}
      {step === 4 && (
        <Step4DailyLife
          members={data.members}
          memberRoutines={data.memberRoutines}
          memberSchedules={data.memberSchedules}
          memberQuietHours={data.memberQuietHours}
          setupFor={data.setupFor}
          showReward={showStep4Reward}
          onUpdate={(routines, schedules) =>
            updateData({ memberRoutines: routines, memberSchedules: schedules })
          }
          onQuietHoursUpdate={(memberQuietHours) => updateData({ memberQuietHours })}
          onComplete={() => { setShowStep4Reward(false); goToStep(5); }}
        />
      )}
      {step === 5 && (
        <Step5Experience
          experience={data.helperExperience}
          pace={data.helperPace}
          onUpdate={(helperExperience, helperPace) => updateData({ helperExperience, helperPace })}
        />
      )}
      {step === 6 && (
        <Step7HelperDetails
          helperDetails={data.helperDetails}
          inviteCode={data.inviteCode}
          inviteQrData={data.inviteQrData}
          helperHasPhone={data.helperHasPhone}
          onUpdate={(details, code, qrData) =>
            updateData({
              helperDetails: details,
              inviteCode: code,
              inviteQrData: qrData,
            })
          }
        />
      )}
      {step === 7 && (
        <Step8Review
          data={data}
          preGenResult={seg1Result}
          preGenError={seg1Error}
          onTimetableGenerated={(tasks) => {
            updateData({ weeklyTasks: tasks });
            setSeg1Result(null);
          }}
          onRetry={() => {
            setSeg1Result(null);
            setSeg1Error(false);
            triggerSegment(data, ["monday", "tuesday", "wednesday"], setSeg1Result, () => setSeg1Error(true));
          }}
        />
      )}
      {step === 8 && data.weeklyTasks && (
        <Step9ScheduleReview
          weeklyTasks={data.weeklyTasks}
          rooms={data.rooms}
          onUpdate={(tasks) => updateData({ weeklyTasks: tasks })}
          onComplete={() => goToStep(9)}
          seg2Result={seg2Result}
          seg3Result={seg3Result}
          seg23Error={seg23Error}
          onSegmentsArrived={mergeSegmentDays}
          onRetrySeg23={() => {
            setSeg2Result(null);
            setSeg3Result(null);
            setSeg23Error(false);
            triggerSegment(data, ["thursday", "friday", "saturday"], setSeg2Result, () => setSeg23Error(true));
            triggerSegment(data, ["sunday"], setSeg3Result, () => setSeg23Error(true));
          }}
          wizardData={{
            homeName: data.homeName,
            rooms: data.rooms,
            members: data.members,
            helperDetails: data.helperDetails,
            memberRoutines: data.memberRoutines,
            memberSchedules: data.memberSchedules,
            priorities: data.priorities,
            helperExperience: data.helperExperience,
            helperPace: data.helperPace,
            homeSize: data.homeSize,
            deepCleanTasks: data.deepCleanTasks,
          }}
        />
      )}
      {step === 9 && (
        <StepSignUp onComplete={handleComplete} />
      )}
    </WizardShell>
  );
}

export default function Page() {
  return (
    <Suspense>
      <EmployerOnboardingPage />
    </Suspense>
  );
}
