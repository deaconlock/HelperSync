export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ParsedRoom {
  id: string;
  name: string;
}

export interface ParsedSchedule {
  monday: Array<{ start: string; end: string; label?: string }>;
  tuesday: Array<{ start: string; end: string; label?: string }>;
  wednesday: Array<{ start: string; end: string; label?: string }>;
  thursday: Array<{ start: string; end: string; label?: string }>;
  friday: Array<{ start: string; end: string; label?: string }>;
  saturday: Array<{ start: string; end: string; label?: string }>;
  sunday: Array<{ start: string; end: string; label?: string }>;
}
