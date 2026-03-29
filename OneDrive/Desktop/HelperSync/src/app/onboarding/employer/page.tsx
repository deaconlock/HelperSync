"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Loader2 } from "lucide-react";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { Step1Household } from "@/components/onboarding/steps/Step1Household";
import { Step2Members } from "@/components/onboarding/steps/Step2Members";
import { Step3Priorities } from "@/components/onboarding/steps/Step3Priorities";
import { Step4DailyLife } from "@/components/onboarding/steps/Step4DailyLife";
import { Step5Experience } from "@/components/onboarding/steps/Step5Experience";
import { Step7HelperDetails } from "@/components/onboarding/steps/Step7HelperDetails";
import { Step8Review } from "@/components/onboarding/steps/Step8Review";
import { Step9ScheduleReview } from "@/components/onboarding/steps/Step9ScheduleReview";
import { StepSignUp } from "@/components/onboarding/steps/StepSignUp";
import { createInviteData } from "@/lib/invite";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { useSearchParams } from "next/navigation";
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

export interface WizardData {
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

export default function EmployerOnboardingPage() {
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
  const [completingRef] = useState({ called: false });

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
      if (parsed >= 1 && parsed <= TOTAL_STEPS) setStep(parsed);
    }
    setHydrated(true);
  }, []);

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
  const handleNext = () => goToStep(Math.min(step + 1, TOTAL_STEPS));
  const handleBack = () => goToStep(Math.max(step - 1, 1));

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
      case 1: return data.rooms.length > 0;
      case 2: return data.members.length > 0;
      case 3: return data.priorities.length >= 1 && data.priorities.length <= 3;
      case 4: return true; // daily life is optional
      case 5: return data.helperExperience !== null;
      case 6: return data.helperDetails !== null && data.inviteCode !== "";
      case 7: return data.weeklyTasks !== null;
      case 8: return data.weeklyTasks !== null;
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

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL_STEPS}
      onNext={handleNext}
      onBack={handleBack}
      canProceed={canProceed()}
      isLastStep={step === TOTAL_STEPS}
      wide={step === 8}
      hideFooter={step === 8 || step === 9}
    >
      {step === 1 && (
        <Step1Household
          rooms={data.rooms}
          homeName={data.homeName}
          homeDescription={data.homeDescription}
          homeSize={data.homeSize}
          onUpdate={(rooms, homeName, homeDescription, homeSize) =>
            updateData({ rooms, homeName, homeDescription, homeSize })
          }
        />
      )}
      {step === 2 && (
        <Step2Members
          members={data.members}
          onUpdate={(members) => updateData({ members })}
        />
      )}
      {step === 3 && (
        <Step3Priorities
          priorities={data.priorities}
          rooms={data.rooms}
          deepCleanTasks={data.deepCleanTasks}
          onUpdate={(priorities, deepCleanTasks) => updateData({ priorities, deepCleanTasks })}
        />
      )}
      {step === 4 && (
        <Step4DailyLife
          members={data.members}
          memberRoutines={data.memberRoutines}
          memberSchedules={data.memberSchedules}
          onUpdate={(routines, schedules) =>
            updateData({ memberRoutines: routines, memberSchedules: schedules })
          }
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
          onTimetableGenerated={(tasks) => {
            updateData({ weeklyTasks: tasks });
          }}
        />
      )}
      {step === 8 && data.weeklyTasks && (
        <Step9ScheduleReview
          weeklyTasks={data.weeklyTasks}
          rooms={data.rooms}
          onUpdate={(tasks) => updateData({ weeklyTasks: tasks })}
          onComplete={() => goToStep(9)}
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
