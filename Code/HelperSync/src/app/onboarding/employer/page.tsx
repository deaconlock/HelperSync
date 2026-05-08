"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { derivePersona } from "@/components/onboarding/PersonaCard";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { Step1Household } from "@/components/onboarding/steps/Step1Household";
import { Step2Members } from "@/components/onboarding/steps/Step2Members";
import { Step4DailyLife } from "@/components/onboarding/steps/Step4DailyLife";
import { StepSignUp } from "@/components/onboarding/steps/StepSignUp";
import { PersonaCard } from "@/components/onboarding/PersonaCard";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { FeatureHighlightScreen } from "@/components/onboarding/FeatureHighlightScreen";
import { SocialProofScreen } from "@/components/onboarding/SocialProofScreen";
import { SurveyQuestionScreen } from "@/components/onboarding/SurveyQuestionScreen";
import { SurveyResultScreen } from "@/components/onboarding/SurveyResultScreen";
import { RewardTimetableScreen } from "@/components/onboarding/RewardTimetableScreen";
import { GeneratingScheduleScreen, fetchTimetable } from "@/components/onboarding/GeneratingScheduleScreen";
import { DayTasks } from "@/types/timetable";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { HouseholdMember } from "@/types/household";

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
  members: HouseholdMember[];
  priorities: Priority[];
  memberRoutines: Record<string, string>;
  memberQuietHours: Record<string, string>;
  householdRoutine: string;
  dailyLifeAnswers: Record<string, string | string[]>;
  // Legacy fields used by older step components
  weeklyTasks?: DayTasks[] | null;
  helperDetails?: { name?: string; nationality?: string; phone?: string; language?: string };
  inviteCode?: string;
  helperPace?: HelperPace;
}

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
  members: [],
  priorities: [],
  memberRoutines: {},
  memberQuietHours: {},
  householdRoutine: "",
  dailyLifeAnswers: {},
};

const TOTAL_STEPS = 4;

const STEP_NAMES: Record<number, string> = {
  1: "Your Home",
  2: "Your Household",
  3: "Daily Life",
  4: "Sign Up",
};

function EmployerOnboardingPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [hydrated, setHydrated] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showFeature1, setShowFeature1] = useState(false);
  const [showSocialProof, setShowSocialProof] = useState(false);
  const [surveyStep, setSurveyStep] = useState(0);
  const [showSurveyResult, setShowSurveyResult] = useState(false);
  const [experienceAnswer, setExperienceAnswer] = useState<string | null>(null);
  const [showPersonaCard, setShowPersonaCard] = useState(false);
  const [showRewardTimetable, setShowRewardTimetable] = useState(false);
  const [returnedFromTimetable, setReturnedFromTimetable] = useState(false);
  const [showGenerating, setShowGenerating] = useState(false);
  const preGenPromiseRef = useRef<Promise<DayTasks[]> | null>(null);
  const [completingRef] = useState({ called: false });
  const stepEnterTimeRef = useRef<number>(Date.now());

  const { track } = useAnalytics();

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
      if (parsed >= 1 && parsed <= TOTAL_STEPS) setStep(parsed);
    } else {
      setShowWelcome(true);
    }
    setHydrated(true);
  }, []);

  // Handle OAuth redirect
  useEffect(() => {
    if (!hydrated || completingRef.called) return;
    if (searchParams.get("completing") !== "true") return;
    if (!isSignedIn) return;

    completingRef.called = true;
    handleComplete();
  }, [hydrated, isSignedIn, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleNext = () => goToStep(Math.min(step + 1, TOTAL_STEPS));
  const handleBack = () => goToStep(Math.max(step - 1, 1));
  const handleStepClick = (targetStep: number) => {
    if (targetStep < step) goToStep(targetStep);
  };

  const handleComplete = async () => {
    const persona = derivePersona(data.setupFor, data.householdFocus, data.firstTimeEmployer);
    track("onboarding_completed", {
      totalTimeSeconds: Math.round((Date.now() - stepEnterTimeRef.current) / 1000),
      persona: persona.name,
    });
    setShowGenerating(true);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return data.rooms.length > 0;
      case 2: return data.members.length > 0;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  // Show loading screen while completing OAuth flow (but not once generation has started)
  if (searchParams.get("completing") === "true" && !showGenerating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <p className="text-sm text-text-muted">Setting up your household...</p>
      </div>
    );
  }

  if (showWelcome && hydrated) {
    return <WelcomeScreen onStart={() => { setShowWelcome(false); setShowFeature1(true); }} />;
  }

  if (showFeature1 && hydrated) {
    return (
      <FeatureHighlightScreen
        key="feature1"
        title="AI-generated weekly schedule"
        body="Answer a few questions about your household and we'll generate a personalised task timetable in seconds. No spreadsheets. No whiteboards."
        image="/images/timetable3.png"
        imageCrop="12%"
        onContinue={() => { setShowFeature1(false); setShowSocialProof(true); }}
      />
    );
  }

  if (showSocialProof && hydrated) {
    return <SocialProofScreen onContinue={() => { setShowSocialProof(false); setSurveyStep(1); }} />;
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
        onBack={() => { setSurveyStep(0); setShowSocialProof(true); }}
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

  if (showGenerating && hydrated) {
    return <GeneratingScheduleScreen data={data} preGenPromise={preGenPromiseRef.current ?? undefined} />;
  }

  if (showRewardTimetable && hydrated) {
    return (
      <RewardTimetableScreen
        data={data}
        onContinue={() => {
          // Generation already started when Step 3 completed — just proceed
          setShowRewardTimetable(false);
          goToStep(4);
        }}
        onBack={() => { setShowRewardTimetable(false); setReturnedFromTimetable(true); }}
      />
    );
  }

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL_STEPS}
      onStepClick={handleStepClick}
      stepLabels={["Your Home", "Your Household", "Daily Life", "Sign Up"]}
      onNext={handleNext}
      onBack={handleBack}
      canProceed={canProceed()}
      isLastStep={step === TOTAL_STEPS}
      hideFooter={step === 1 || step === 3 || step === 4}
    >
      {step === 1 && (
        <Step1Household
          rooms={data.rooms}
          homeSize={data.homeSize}
          onUpdate={(rooms, homeSize) => updateData({ rooms, homeSize })}
          onNext={handleNext}
        />
      )}
      {step === 2 && (
        <Step2Members
          members={data.members}
          setupFor={data.setupFor}
          onUpdate={(members) => {
            const presetRoutines: Record<string, string> = { ...data.memberRoutines };
            members.forEach((m, i) => {
              const key = m.name.toLowerCase().replace(/\s+/g, "-") || `member-${i}`;
              const presetText = m.timePresets && m.timePresets.length > 0
                ? `Usually home: ${m.timePresets.map((p) =>
                    p === "morning" ? "mornings" : p === "afternoon" ? "afternoons" : p === "evening" ? "evenings" : "all day"
                  ).join(", ")}`
                : "";
              const existing = presetRoutines[key] ?? "";
              const withoutOldPreset = existing.split("\n").filter((l) => !l.startsWith("Usually home:")).join("\n");
              presetRoutines[key] = [presetText, withoutOldPreset].filter(Boolean).join("\n");
            });
            updateData({ members, memberRoutines: presetRoutines });
          }}
        />
      )}
      {step === 3 && (
        <Step4DailyLife
          members={data.members}
          memberRoutines={data.memberRoutines}
          memberQuietHours={data.memberQuietHours}
          setupFor={data.setupFor}
          showReward={false}
          initialAnswers={returnedFromTimetable ? (data.dailyLifeAnswers ?? {}) : undefined}
          startAtLast={returnedFromTimetable}
          onUpdate={(routines) => updateData({ memberRoutines: routines })}
          onQuietHoursUpdate={(memberQuietHours) => updateData({ memberQuietHours })}
          onComplete={(householdRoutine, dailyLifeAnswers) => {
            const next = { householdRoutine, dailyLifeAnswers };
            updateData(next);
            // Start AI generation immediately while user views the reward screen
            preGenPromiseRef.current = fetchTimetable({ ...data, ...next });
            setReturnedFromTimetable(false);
            setShowRewardTimetable(true);
          }}
          onDismissReward={() => goToStep(2)}
        />
      )}
      {step === 4 && (
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
