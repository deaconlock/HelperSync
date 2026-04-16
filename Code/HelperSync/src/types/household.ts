export type MemberRole = "Me" | "Spouse" | "Child" | "Elderly" | "Pets" | "Relative";

export type TimePreset = "morning" | "afternoon" | "evening" | "allday";

export interface HouseholdMember {
  name: string;
  role?: MemberRole;
  age?: number;
  timePresets?: TimePreset[];
  // Elderly-specific fields
  mobilityLevel?: "independent" | "needs_assistance" | "wheelchair" | "bedridden";
  medicalConditions?: string;
  medications?: string;
  dietaryRestrictions?: string;
  napSchedule?: string;
  emergencyContact?: string;
}

export interface HelperDetails {
  name: string;
  nationality: string;
  phone: string;
  language: string;
}

export interface HouseholdDoc {
  _id: string;
  employerUserId: string;
  homeName: string;
  rooms: string[];
  members: HouseholdMember[];
  helperDetails?: HelperDetails;
  inviteCode: string;
  inviteQrData: string;
  createdAt: number;
}
