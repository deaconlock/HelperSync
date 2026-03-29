export interface TimeSlot {
  start: string; // "09:00"
  end: string; // "18:00"
  label?: string; // "Work from home"
}

export interface DayAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}
