"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { derivePersona } from "@/components/onboarding/PersonaCard";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Loader2 } from "lucide-react";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { Step0Qualification } from "@/components/onboarding/steps/Step0Qualification";
import { Step1Household } from "@/components/onboarding/steps/Step1Household";
import { Step2Members } from "@/components/onboarding/steps/Step2Members";
import { Step4DailyLife } from "@/components/onboarding/steps/Step4DailyLife";
import { Step1bDeepClean } from "@/components/onboarding/steps/Step1bDeepClean";
import { Step4bServicePrefs } from "@/components/onboarding/steps/Step4bServicePrefs";
import { Step5Experience } from "@/components/onboarding/steps/Step5Experience";
import { Step7HelperDetails } from "@/components/onboarding/steps/Step7HelperDetails";
import { Step8Review } from "@/components/onboarding/steps/Step8Review";
import { Step9ScheduleReview } from "@/components/onboarding/steps/Step9ScheduleReview";
import { StepSignUp } from "@/components/onboarding/steps/StepSignUp";
import { createInviteData } from "@/lib/invite";
import { PersonaCard } from "@/components/onboarding/PersonaCard";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { ReaffirmScreen } from "@/components/onboarding/ReaffirmScreen";
import { FeatureHighlightScreen } from "@/components/onboarding/FeatureHighlightScreen";
import { SocialProofScreen } from "@/components/onboarding/SocialProofScreen";
import { SurveyIntroScreen } from "@/components/onboarding/SurveyIntroScreen";
import { SurveyQuestionScreen } from "@/components/onboarding/SurveyQuestionScreen";
import { SurveyResultScreen } from "@/components/onboarding/SurveyResultScreen";
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
export type MiscommunicationFrequency = "never" | "sometimes" | "often" | "always";
export type TimeReexplainingTasks = "under30" | "30to60" | "over60" | "toomuch";

export interface WizardData {
  // Qualifying questions (Step 1)
  setupFor: SetupFor | null;
  firstTimeEmployer: boolean | null;
  householdFocus: Priority[];
  helperHasPhone: boolean | null;
  miscommunicationFrequency: MiscommunicationFrequency | null;
  timeReexplainingTasks: TimeReexplainingTasks | null;
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
  servicePrefs: Record<string, string[]>;
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
  miscommunicationFrequency: null,
  timeReexplainingTasks: null,
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
  servicePrefs: {},
  helperExperience: null,
  helperPace: "balanced",
  employerAvailability: null,
  wifeAvailability: null,
  helperDetails: null,
  inviteCode: "",
  inviteQrData: "",
  weeklyTasks: null,
};

const TOTAL_STEPS = 8;

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
  const [showWelcome, setShowWelcome] = useState(false);
  const [showReaffirm, setShowReaffirm] = useState(false);
  const [showFeature1, setShowFeature1] = useState(false);
  const [showFeature2, setShowFeature2] = useState(false);
  const [showFeature3, setShowFeature3] = useState(false);
  const [showSocialProof, setShowSocialProof] = useState(false);
  const [showSurveyIntro, setShowSurveyIntro] = useState(false);
  const [surveyStep, setSurveyStep] = useState(0); // 0 = not started, 1–5 = active question
  const [showSurveyResult, setShowSurveyResult] = useState(false);
  const [experienceAnswer, setExperienceAnswer] = useState<string | null>(null);
  const [showPersonaCard, setShowPersonaCard] = useState(false);
  const [showStep4Reward, setShowStep4Reward] = useState(false);
  const [seg1Result, setSeg1Result] = useState<DayTasks[] | null>(null);
  const [seg2Result, setSeg2Result] = useState<DayTasks[] | null>(null);
  const [seg3Result, setSeg3Result] = useState<DayTasks[] | null>(null);
  const [seg1Error, setSeg1Error] = useState(false);
  const [seg23Error, setSeg23Error] = useState(false);
  const [completingRef] = useState({ called: false });
  const seg23TimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepEnterTimeRef = useRef<number>(Date.now());

  const { track } = useAnalytics();

  const STEP_NAMES: Record<number, string> = {
    1: "Qualification",
    2: "Home Setup",
    3: "Members",
    4: "Daily Life",
    4.5: "Service Prefs",
    5: "Helper Experience",
    6: "Helper Details",
    7: "Schedule",
    8: "Review",
    9: "Sign Up",
  };

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

  // Track initial step view after hydration
  useEffect(() => {
    if (!hydrated) return;
    stepEnterTimeRef.current = Date.now();
    track("onboarding_step_viewed", {
      step,
      stepName: STEP_NAMES[step] ?? String(step),
    });
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (parsed >= 1 && parsed <= 8) setStep(parsed);
      // Already in-progress — skip welcome screen
    } else {
      // Fresh session — show welcome
      setShowWelcome(true);
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
    // Track time spent on outgoing step
    const timeOnStep = Math.round((Date.now() - stepEnterTimeRef.current) / 1000);
    track("onboarding_step_completed", {
      step,
      stepName: STEP_NAMES[step] ?? String(step),
      timeOnStepSeconds: timeOnStep,
    });
    stepEnterTimeRef.current = Date.now();
    setStep(s);
    localStorage.setItem("helpersync-wizard-step", String(s));
    track("onboarding_step_viewed", {
      step: s,
      stepName: STEP_NAMES[s] ?? String(s),
    });
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
          servicePrefs: d.servicePrefs,
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
    if (step === 1) { goToStep(1.5); return; }
    if (step === 1.5) { goToStep(2); return; }
    if (step === 5) {
      // Segment 1: Mon/Tue/Wed — fires while user reads portrait cards on step 6
      setSeg1Result(null);
      setSeg1Error(false);
      triggerSegment(data, ["monday", "tuesday", "wednesday"], setSeg1Result, () => setSeg1Error(true));
    }
    if (step === 6) {
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
  const handleBack = () => {
    if (step === 1.5) { goToStep(1); return; }
    if (step === 3.5) { goToStep(3); return; }
    goToStep(Math.max(step - 1, 1));
  };
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
      const persona = derivePersona(d.setupFor, d.householdFocus, d.firstTimeEmployer);
      track("onboarding_completed", {
        totalTimeSeconds: Math.round((Date.now() - stepEnterTimeRef.current) / 1000),
        persona: persona.name,
      });
      toast.success("Household set up successfully!");
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save household. Please try again.");
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return data.rooms.length > 0;                  // Step1Household
      case 1.5: return true;                                  // Step1bDeepClean (optional)
      case 2: return data.members.length > 0;                // Step2Members
      case 3: return true;                                    // Step4DailyLife (optional)
      case 3.5: return true;                                  // Step4bServicePrefs (optional)
      case 4: return data.helperExperience !== null;          // Step5Experience
      case 5: return data.helperDetails !== null && (data.inviteCode !== "" || data.helperHasPhone === false); // Step7HelperDetails
      case 6: return data.weeklyTasks !== null;               // Step8Review
      case 7: return (data.weeklyTasks?.length ?? 0) >= 7;   // Step9ScheduleReview
      case 8: return true;                                    // StepSignUp
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

  if (showWelcome && hydrated) {
    return <WelcomeScreen onStart={() => { setShowWelcome(false); setShowReaffirm(true); }} />;
  }

  if (showReaffirm && hydrated) {
    return <ReaffirmScreen onContinue={() => { setShowReaffirm(false); setShowFeature1(true); }} />;
  }

  if (showFeature1 && hydrated) {
    return (
      <FeatureHighlightScreen
        key="feature1"
        title="AI-generated weekly schedule"
        body="Answer a few questions about your household and we'll generate a personalised task timetable in seconds. No spreadsheets. No whiteboards."
        image="/images/timetable3.png"
        imageCrop="12%"
        onContinue={() => { setShowFeature1(false); setShowFeature2(true); }}
      />
    );
  }

  if (showFeature2 && hydrated) {
    return (
      <FeatureHighlightScreen
        key="feature2"
        title="Your helper sees their tasks — you see their progress"
        body="Helpers mark tasks done from their phone. You get a live view from yours. No more 'did you do the laundry?' conversations."
        image="/images/helperview2.png"
        imageCrop="12%"
        onContinue={() => { setShowFeature2(false); setShowFeature3(true); }}
      />
    );
  }

  if (showSocialProof && hydrated) {
    return <SocialProofScreen onContinue={() => { setShowSocialProof(false); setShowSurveyIntro(true); }} />;
  }

  if (showSurveyIntro && hydrated) {
    return <SurveyIntroScreen onContinue={() => { setShowSurveyIntro(false); setSurveyStep(1); }} />;
  }

  if (surveyStep === 1 && hydrated) {
    return (
      <SurveyQuestionScreen
        key="sq1"
        question="Who are you setting this up for?"
        options={[
          { value: "own", emoji: "🏠", label: "My own home", sub: "I live where the helper works" },
          { value: "family", emoji: "👵", label: "A family member's home", sub: "e.g. parents, in-laws, relatives" },
        ]}
        selected={data.setupFor}
        onSelect={(v) => setData((d) => ({ ...d, setupFor: v as "own" | "family" }))}
        onContinue={() => setSurveyStep(2)}
        onBack={() => { setSurveyStep(0); setShowSurveyIntro(true); }}
      />
    );
  }

  if (surveyStep === 2 && hydrated) {
    return (
      <SurveyQuestionScreen
        key="sq2"
        question="Have you managed a helper before?"
        options={[
          { value: "experienced", emoji: "✅", label: "Yes, I've had helpers for years" },
          { value: "stressful", emoji: "🌱", label: "Yes but I still find it stressful" },
          { value: "new", emoji: "🆕", label: "No, this is my first time" },
        ]}
        selected={experienceAnswer}
        onSelect={(v) => {
          setExperienceAnswer(v);
          setData((d) => ({ ...d, firstTimeEmployer: v === "new" }));
        }}
        onContinue={() => setSurveyStep(3)}
        onBack={() => setSurveyStep(1)}
      />
    );
  }

  if (surveyStep === 3 && hydrated) {
    return (
      <SurveyQuestionScreen
        key="sq3"
        question="What does your household need most?"
        options={[
          { value: "meals", emoji: "🍳", label: "Meals & cooking" },
          { value: "cleanliness", emoji: "🧹", label: "Cleaning & chores" },
          { value: "childcare", emoji: "👶", label: "Childcare" },
          { value: "elderlycare", emoji: "👴", label: "Elderly care" },
          { value: "laundry", emoji: "👕", label: "Laundry" },
          { value: "grocery", emoji: "🛒", label: "Errands & grocery" },
        ]}
        selected={data.householdFocus}
        multiSelect
        onSelect={(v) => setData((d) => {
          const current = d.householdFocus as string[];
          const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
          return { ...d, householdFocus: next as Priority[] };
        })}
        onContinue={() => setSurveyStep(4)}
        onBack={() => setSurveyStep(2)}
      />
    );
  }

  if (surveyStep === 4 && hydrated) {
    const isNewUser = experienceAnswer === "new";
    return isNewUser ? (
      <SurveyQuestionScreen
        key="sq4-new"
        question="What worries you most about having a helper for the first time?"
        options={[
          { value: "trust", emoji: "🤝", label: "Trusting someone in my home" },
          { value: "communication", emoji: "💬", label: "Explaining what I want clearly" },
          { value: "routine", emoji: "📋", label: "Building a consistent routine" },
          { value: "unsure", emoji: "🤷", label: "Not sure where to even start" },
        ]}
        selected={data.miscommunicationFrequency}
        onSelect={(v) => setData((d) => ({ ...d, miscommunicationFrequency: v as MiscommunicationFrequency }))}
        onContinue={() => setSurveyStep(5)}
        onBack={() => setSurveyStep(3)}
      />
    ) : (
      <SurveyQuestionScreen
        key="sq4-experienced"
        question="How often does miscommunication with your helper cause frustration?"
        options={[
          { value: "never", emoji: "😌", label: "Never — things run smoothly" },
          { value: "sometimes", emoji: "🤔", label: "Sometimes — a few times a month" },
          { value: "often", emoji: "😩", label: "Often — almost every week" },
          { value: "always", emoji: "😤", label: "Constantly — it's a real problem" },
        ]}
        selected={data.miscommunicationFrequency}
        onSelect={(v) => setData((d) => ({ ...d, miscommunicationFrequency: v as MiscommunicationFrequency }))}
        onContinue={() => setSurveyStep(5)}
        onBack={() => setSurveyStep(3)}
      />
    );
  }

  if (surveyStep === 5 && hydrated) {
    const isNewUser = experienceAnswer === "new";
    return isNewUser ? (
      <SurveyQuestionScreen
        key="sq5-new"
        question="How much time do you spend managing household tasks yourself each week?"
        options={[
          { value: "under30", emoji: "⚡", label: "Under 30 minutes" },
          { value: "30to60", emoji: "⏳", label: "30–60 minutes" },
          { value: "over60", emoji: "😮‍💨", label: "Over an hour" },
          { value: "toomuch", emoji: "🤯", label: "Way too much — it's exhausting" },
        ]}
        selected={data.timeReexplainingTasks}
        onSelect={(v) => setData((d) => ({ ...d, timeReexplainingTasks: v as TimeReexplainingTasks }))}
        onContinue={() => { setSurveyStep(0); setShowSurveyResult(true); }}
        onBack={() => setSurveyStep(4)}
      />
    ) : (
      <SurveyQuestionScreen
        key="sq5-experienced"
        question="How much time do you spend re-explaining tasks each week?"
        options={[
          { value: "under30", emoji: "⚡", label: "Under 30 minutes" },
          { value: "30to60", emoji: "⏳", label: "30–60 minutes" },
          { value: "over60", emoji: "😮‍💨", label: "Over an hour" },
          { value: "toomuch", emoji: "🤯", label: "Way too much — it's exhausting" },
        ]}
        selected={data.timeReexplainingTasks}
        onSelect={(v) => setData((d) => ({ ...d, timeReexplainingTasks: v as TimeReexplainingTasks }))}
        onContinue={() => { setSurveyStep(0); setShowSurveyResult(true); }}
        onBack={() => setSurveyStep(4)}
      />
    );
  }

  if (showFeature3 && hydrated) {
    return (
      <FeatureHighlightScreen
        key="feature3"
        title="Set it once. Run every week."
        body="Schedules repeat automatically. You only intervene when something changes."
        image="/images/recurring.png"
        imageCrop="12%"
        onContinue={() => { setShowFeature3(false); setShowSocialProof(true); }}
      />
    );
  }

  if (showSurveyResult && hydrated) {
    return (
      <SurveyResultScreen
        setupFor={data.setupFor}
        householdFocus={data.householdFocus}
        experienceAnswer={experienceAnswer}
        timeReexplainingTasks={data.timeReexplainingTasks}
        miscommunicationFrequency={data.miscommunicationFrequency}
        onContinue={() => setShowSurveyResult(false)}
      />
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
          goToStep(1);
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
        "Your Home",
        "Your Household",
        "Daily Life",
        "Your Helper",
        "Helper Details",
        "Build Schedule",
        "Review Schedule",
        "Confirm",
      ]}
      onNext={step === 3
        ? () => {
            const hasRoutines = Object.values(data.memberRoutines).some((v) => v?.trim());
            if (hasRoutines) {
              setShowStep4Reward(true);
            } else {
              goToStep(4);
            }
          }
        : handleNext
      }
      onBack={handleBack}
      canProceed={canProceed()}
      isLastStep={step === TOTAL_STEPS}
      wide={step === 7}
      hideFooter={step === 7 || step === 8}
    >
      {step === 1 && (
        <Step1Household
          rooms={data.rooms}
          homeName={data.homeName}
          homeDescription={data.homeDescription}
          homeSize={data.homeSize}
          setupFor={data.setupFor}
          onUpdate={(rooms, homeName, homeDescription, homeSize) =>
            updateData({ rooms, homeName, homeDescription, homeSize })
          }
        />
      )}
      {step === 1.5 && (
        <Step1bDeepClean
          rooms={data.rooms}
          deepCleanTasks={data.deepCleanTasks}
          onUpdate={(deepCleanTasks) => updateData({ deepCleanTasks })}
        />
      )}
      {step === 2 && (
        <Step2Members
          members={data.members}
          setupFor={data.setupFor}
          onUpdate={(members) => updateData({ members })}
        />
      )}
      {step === 3 && (
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
          onComplete={() => { setShowStep4Reward(false); goToStep(3.5); }}
        />
      )}
      {step === 3.5 && (
        <Step4bServicePrefs
          members={data.members}
          householdFocus={data.householdFocus}
          servicePrefs={data.servicePrefs}
          onUpdate={(servicePrefs) => updateData({ servicePrefs })}
          onComplete={() => goToStep(4)}
        />
      )}
      {step === 4 && (
        <Step5Experience
          experience={data.helperExperience}
          pace={data.helperPace}
          onUpdate={(helperExperience, helperPace) => updateData({ helperExperience, helperPace })}
        />
      )}
      {step === 5 && (
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
      {step === 6 && (
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
      {step === 7 && data.weeklyTasks && (
        <Step9ScheduleReview
          weeklyTasks={data.weeklyTasks}
          rooms={data.rooms}
          onUpdate={(tasks) => updateData({ weeklyTasks: tasks })}
          onComplete={() => goToStep(8)}
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
      {step === 8 && (
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
