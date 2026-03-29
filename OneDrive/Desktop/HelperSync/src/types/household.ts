export type MemberRole = "Husband" | "Wife" | "Child" | "Elderly" | "Other";

export interface HouseholdMember {
  name: string;
  role: MemberRole;
  age?: number;
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
