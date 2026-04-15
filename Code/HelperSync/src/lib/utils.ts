import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | number): string {
  return format(new Date(date), "EEEE, d MMMM yyyy");
}

export function formatDateShort(date: Date | string | number): string {
  return format(new Date(date), "d MMM");
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // remove confusing chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function formatInviteCode(code: string): string {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

export function buildInviteUrl(code: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/join/${code}`;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    "Household Chores": "🧹",
    "Baby Care": "🍼",
    "Elderly Care": "👴",
    "Meal Prep": "🍳",
    Errands: "🛍️",
  };
  return map[category] ?? "✅";
}

export function getTaskEmoji(taskName: string, category: string): string {
  const lower = taskName.toLowerCase();
  if (lower.includes("sweep") || lower.includes("broom")) return "🧹";
  if (lower.includes("mop")) return "🧽";
  if (lower.includes("bath") || lower.includes("shower")) return "🛁";
  if (lower.includes("feed") || lower.includes("milk")) return "🍼";
  if (lower.includes("cook") || lower.includes("meal")) return "🍳";
  if (lower.includes("laundry") || lower.includes("wash")) return "👕";
  if (lower.includes("iron")) return "👔";
  if (lower.includes("vacuum")) return "🌀";
  if (lower.includes("dust")) return "🪣";
  if (lower.includes("grocery") || lower.includes("market")) return "🛒";
  if (lower.includes("medication") || lower.includes("medicine")) return "💊";
  if (lower.includes("walk")) return "🚶";
  if (lower.includes("sleep") || lower.includes("nap")) return "😴";
  if (lower.includes("play")) return "🎮";
  return getCategoryEmoji(category);
}

export function getDaysUntilTrialEnd(trialEndsAt: number): number {
  const now = Date.now();
  const diff = trialEndsAt - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
