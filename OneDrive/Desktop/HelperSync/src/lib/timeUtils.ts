/** Parse "HH:MM" to minutes since midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Convert minutes since midnight to "HH:MM" */
export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Round minutes to the nearest N-minute increment */
export function roundToNearest(minutes: number, increment: number): number {
  return Math.round(minutes / increment) * increment;
}

/**
 * Calculate the new time for a task dropped at `newIndex` among `tasks`.
 * - Between two tasks: midpoint of neighbors' times
 * - At top (index 0): 15 min before first task (min 06:00)
 * - At bottom: 15 min after last task (max 22:00)
 * Rounds to nearest 5 minutes for clean times.
 */
export function calculateDropTime(
  tasks: { time: string; taskId?: string }[],
  newIndex: number,
  draggedTaskId?: string
): string {
  // Filter out the dragged task so we calculate based on remaining neighbors
  const others = draggedTaskId
    ? tasks.filter((t) => t.taskId !== draggedTaskId)
    : tasks;

  if (others.length === 0) return "09:00";

  const MIN_TIME = 6 * 60; // 06:00
  const MAX_TIME = 22 * 60; // 22:00

  let newMinutes: number;

  if (newIndex <= 0) {
    // Dropped at top
    newMinutes = Math.max(MIN_TIME, timeToMinutes(others[0].time) - 15);
  } else if (newIndex >= others.length) {
    // Dropped at bottom
    newMinutes = Math.min(MAX_TIME, timeToMinutes(others[others.length - 1].time) + 15);
  } else {
    // Between two tasks
    const prevTime = timeToMinutes(others[newIndex - 1].time);
    const nextTime = timeToMinutes(others[newIndex].time);
    newMinutes = Math.round((prevTime + nextTime) / 2);
  }

  // Round to nearest 5 minutes
  newMinutes = roundToNearest(newMinutes, 5);

  return minutesToTime(newMinutes);
}
