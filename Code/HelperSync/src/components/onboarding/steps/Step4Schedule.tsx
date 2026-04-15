"use client";

// Step 4 is identical to Step 3 but for wife/partner
// We reuse Step3Schedule with person="wife"
import { Step3Schedule } from "./Step3Schedule";
import { DayAvailability } from "@/types/schedule";

interface Step4Props {
  person: "wife";
  availability: DayAvailability;
  onUpdate: (av: DayAvailability) => void;
}

export function Step4Schedule({ person, availability, onUpdate }: Step4Props) {
  return (
    <Step3Schedule person={person} availability={availability} onUpdate={onUpdate} />
  );
}
