"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { BottomSheet } from "./BottomSheet";
import { Trash2, Pencil, Plus, Lock, X, Loader2, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type RuleType = "FIXED_TASK" | "TIME_BLOCK" | "CUSTOM_RULE";

export interface HouseholdRule {
  _id: Id<"householdRules">;
  type: RuleType;
  title: string;
  days: string[];
  startTime?: string;
  endTime?: string;
  duration?: number;
  constraint?: string;
  notes?: string;
  requiresPhoto?: boolean;
  isActive: boolean;
  createdAt: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  householdId: Id<"households">;
  rules: HouseholdRule[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = [
  { key: "monday", label: "M" },
  { key: "tuesday", label: "T" },
  { key: "wednesday", label: "W" },
  { key: "thursday", label: "T" },
  { key: "friday", label: "F" },
  { key: "saturday", label: "S" },
  { key: "sunday", label: "S" },
];

const RULE_TYPES: { type: RuleType; emoji: string; label: string; sub: string }[] = [
  { type: "FIXED_TASK",  emoji: "📌", label: "Fixed task",  sub: "Must happen at an exact time" },
  { type: "TIME_BLOCK",  emoji: "🚫", label: "Time block",  sub: "No tasks during this window" },
  { type: "CUSTOM_RULE", emoji: "✏️", label: "Custom rule", sub: "Describe anything in your own words" },
];

const HOURS   = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const MINUTES = ["00","15","30","45"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt12(time24: string): string {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function ruleDescription(rule: HouseholdRule): string {
  const dayStr = rule.days.length === 7 || rule.days.length === 0
    ? "Daily"
    : rule.days.map((d) => d.slice(0, 3)).join(", ");

  if (rule.type === "FIXED_TASK")
    return `${dayStr} · ${fmt12(rule.startTime ?? "")}${rule.duration ? ` (${rule.duration} min)` : ""}`;
  if (rule.type === "TIME_BLOCK")
    return `${dayStr} · ${fmt12(rule.startTime ?? "")}–${fmt12(rule.endTime ?? "")}`;
  return rule.notes?.slice(0, 60) ?? "";
}

function timeToVal(h: string, m: string, ampm: string): string {
  let hour = parseInt(h);
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, "0")}:${m}`;
}

// ─── Time picker ──────────────────────────────────────────────────────────────

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = value ? (() => {
    const [h, m] = value.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = (h % 12 || 12).toString();
    return { hour, minute: m.toString().padStart(2, "0"), ampm };
  })() : { hour: "8", minute: "00", ampm: "AM" };

  const update = (h: string, m: string, ap: string) => onChange(timeToVal(h, m, ap));

  return (
    <div className="flex items-center gap-1">
      <select value={parsed.hour} onChange={(e) => update(e.target.value, parsed.minute, parsed.ampm)}
        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white outline-none">
        {HOURS.map((h) => <option key={h}>{h}</option>)}
      </select>
      <span className="text-sm text-gray-400">:</span>
      <select value={parsed.minute} onChange={(e) => update(parsed.hour, e.target.value, parsed.ampm)}
        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white outline-none">
        {MINUTES.map((m) => <option key={m}>{m}</option>)}
      </select>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {["AM","PM"].map((ap) => (
          <button key={ap} type="button" onClick={() => update(parsed.hour, parsed.minute, ap)}
            className={cn("px-2.5 py-1.5 text-xs font-medium", parsed.ampm === ap ? "bg-gray-900 text-white" : "bg-white text-gray-500")}>
            {ap}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Day selector ─────────────────────────────────────────────────────────────

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const WEEKENDS = ["saturday", "sunday"];

function DaySelector({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const allSelected = value.length === 7;
  const weekdaysSelected = WEEKDAYS.every((d) => value.includes(d)) && value.length === 5;
  const weekendsSelected = WEEKENDS.every((d) => value.includes(d)) && value.length === 2;
  const toggle = (key: string) => {
    const next = value.includes(key) ? value.filter((d) => d !== key) : [...value, key];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {DAYS.map((d) => (
          <button key={d.key} type="button" onClick={() => toggle(d.key)}
            className={cn(
              "w-9 h-9 rounded-full text-xs font-semibold transition-all",
              value.includes(d.key) ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}>
            {d.label}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={() => onChange(weekdaysSelected ? [] : [...WEEKDAYS])}
          className={cn("text-xs hover:underline", weekdaysSelected ? "text-gray-400" : "text-primary")}>
          {weekdaysSelected ? "Clear" : "Weekdays"}
        </button>
        <button type="button" onClick={() => onChange(weekendsSelected ? [] : [...WEEKENDS])}
          className={cn("text-xs hover:underline", weekendsSelected ? "text-gray-400" : "text-primary")}>
          {weekendsSelected ? "Clear" : "Weekends"}
        </button>
        <button type="button" onClick={() => onChange(allSelected ? [] : DAYS.map((d) => d.key))}
          className={cn("text-xs hover:underline", allSelected ? "text-gray-400" : "text-primary")}>
          {allSelected ? "Clear" : "Every day"}
        </button>
      </div>
    </div>
  );
}

// ─── Add/Edit rule form ───────────────────────────────────────────────────────

interface FormState {
  type: RuleType | null;
  title: string;
  days: string[];
  startTime: string;
  endTime: string;
  duration: string;
  constraint: string;
  notes: string;
  requiresPhoto: boolean;
}

const EMPTY_FORM: FormState = {
  type: null, title: "", days: [], startTime: "08:00", endTime: "09:00",
  duration: "", constraint: "", notes: "", requiresPhoto: false,
};

function RuleForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial?: Partial<FormState>;
  onSave: (f: FormState) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, ...initial });
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const canSave = (() => {
    if (!form.type || !form.title.trim()) return false;
    if (form.type === "FIXED_TASK") return !!form.startTime;
    if (form.type === "TIME_BLOCK") return !!form.startTime && !!form.endTime;
    if (form.type === "CUSTOM_RULE") return !!form.notes.trim();
    return false;
  })();

  return (
    <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
      {/* Type picker */}
      {!form.type ? (
        <div className="grid grid-cols-2 gap-2">
          {RULE_TYPES.map((rt) => (
            <button key={rt.type} onClick={() => set({ type: rt.type })}
              className="flex flex-col items-start gap-1 px-3 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 bg-white text-left transition-all">
              <span className="text-lg">{rt.emoji}</span>
              <span className="text-xs font-semibold text-gray-800">{rt.label}</span>
              <span className="text-xs text-gray-400 leading-tight">{rt.sub}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Type badge + change */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
              {RULE_TYPES.find((r) => r.type === form.type)?.emoji}{" "}
              {RULE_TYPES.find((r) => r.type === form.type)?.label}
            </span>
            <button onClick={() => set({ type: null })} className="text-xs text-gray-400 hover:text-gray-600">Change</button>
          </div>

          {/* Title */}
          {form.type !== "CUSTOM_RULE" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rule name</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder={form.type === "FIXED_TASK" ? "e.g. School pickup" : "e.g. Baby nap"}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {!form.title && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(form.type === "FIXED_TASK"
                    ? ["School pickup", "Prayer time", "Medication", "Gym drop-off"]
                    : ["Baby nap", "Quiet hours", "WFH focus time", "Afternoon rest"]
                  ).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set({ title: s })}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FIXED_TASK fields */}
          {form.type === "FIXED_TASK" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Time</label>
                <TimePicker value={form.startTime} onChange={(v) => set({ startTime: v })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duration <span className="text-gray-400">(optional)</span></label>
                <select value={form.duration} onChange={(e) => set({ duration: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white outline-none">
                  <option value="">Not specified</option>
                  {[15,20,30,45,60,90].map((d) => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Days</label>
                <DaySelector value={form.days} onChange={(v) => set({ days: v })} />
              </div>
            </>
          )}

          {/* TIME_BLOCK fields */}
          {form.type === "TIME_BLOCK" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Start time</label>
                <TimePicker value={form.startTime} onChange={(v) => set({ startTime: v })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">End time</label>
                <TimePicker value={form.endTime} onChange={(v) => set({ endTime: v })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Days</label>
                <DaySelector value={form.days} onChange={(v) => set({ days: v })} />
              </div>
            </>
          )}

          {/* CUSTOM_RULE fields */}
          {form.type === "CUSTOM_RULE" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Describe the rule</label>
              <textarea
                value={form.notes}
                onChange={(e) => set({ notes: e.target.value, title: e.target.value.slice(0, 40) })}
                placeholder="e.g. Helper must not use the washing machine before 9 AM"
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>
          )}
        </>
      )}

      {/* Requires photo toggle — only for FIXED_TASK */}
      {form.type === "FIXED_TASK" && (
        <label className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
          <span className="text-sm text-gray-700">Require photo proof</span>
          <input
            type="checkbox"
            checked={form.requiresPhoto}
            onChange={(e) => set({ requiresPhoto: e.target.checked })}
            className="rounded accent-primary w-4 h-4"
          />
        </label>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={() => canSave && onSave(form)} disabled={!canSave || isSaving}
          className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90">
          Save rule
        </button>
      </div>
    </div>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

export function HouseholdRulesSheet({ open, onClose, householdId, rules }: Props) {
  const addRule    = useMutation(api.householdRules.addRule);
  const deleteRule = useMutation(api.householdRules.deleteRule);
  const updateRule = useMutation(api.householdRules.updateRule);

  const [showForm, setShowForm]         = useState(false);
  const [editingId, setEditingId]       = useState<Id<"householdRules"> | null>(null);
  const [isSaving, setIsSaving]         = useState(false);

  const handleSave = async (form: FormState) => {
    setIsSaving(true);
    try {
      const title = form.type === "CUSTOM_RULE" ? form.notes.slice(0, 40) : form.title;
      const sharedFields = {
        title,
        days: form.days,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        duration: form.duration ? parseInt(form.duration) : undefined,
        constraint: form.constraint || undefined,
        notes: form.notes || undefined,
        requiresPhoto: form.requiresPhoto || undefined,
      };
      if (editingId) {
        await updateRule({ ruleId: editingId, ...sharedFields });
        setEditingId(null);
      } else {
        await addRule({ householdId, type: form.type as RuleType, ...sharedFields });
      }
      setShowForm(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: Id<"householdRules">) => {
    await deleteRule({ ruleId: id });
  };

  const startEdit = (rule: HouseholdRule) => {
    setEditingId(rule._id);
    setShowForm(true);
  };

  const editInitial = editingId ? (() => {
    const r = rules.find((x) => x._id === editingId);
    if (!r) return undefined;
    return {
      type: r.type,
      title: r.title,
      days: r.days,
      startTime: r.startTime ?? "",
      endTime: r.endTime ?? "",
      duration: r.duration?.toString() ?? "",
      constraint: r.constraint ?? "",
      notes: r.notes ?? "",
      requiresPhoto: r.requiresPhoto ?? false,
    };
  })() : undefined;

  return (
    <BottomSheet open={open} onClose={onClose} className="max-h-[90vh] overflow-y-auto">
      <div className="pb-8">
        {/* Header */}
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3 -ml-0.5"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Quick Refine
        </button>
        <p className="text-sm font-semibold text-gray-900 mb-0.5">Schedule Rules</p>
        <p className="text-xs text-gray-400 mb-5">Set in stone — the AI always works around these.</p>

        {/* Rule list */}
        {rules.length === 0 && !showForm && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">🔒</div>
            <p className="text-sm font-medium text-gray-500">No rules yet</p>
            <p className="text-xs mt-0.5">Add a rule and the AI will always respect it.</p>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {rules.map((rule) => (
            <div key={rule._id}
              className="flex items-start gap-3 px-3 py-3 rounded-xl border border-gray-100 bg-gray-50">
              <Lock className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{rule.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{ruleDescription(rule)}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => startEdit(rule)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(rule._id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add / Edit form */}
        {showForm ? (
          <RuleForm
            initial={editInitial}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingId(null); }}
            isSaving={isSaving}
          />
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-all">
            <Plus className="w-4 h-4" /> Set a rule
          </button>
        )}

      </div>
    </BottomSheet>
  );
}
