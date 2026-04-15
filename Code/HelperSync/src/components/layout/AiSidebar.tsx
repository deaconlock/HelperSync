"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Loader2, Check, XCircle, CalendarDays, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/types/ai";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

const IS_DEV = process.env.NODE_ENV === "development";
const DAILY_LIMIT = IS_DEV ? 999 : 10;
const STORAGE_KEY = "helpersync-ai-chat-usage";

function getTodayUsage(): { date: string; count: number } {
  if (typeof window === "undefined") return { date: "", count: 0 };
  const today = new Date().toISOString().split("T")[0];
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (stored.date === today) return stored;
  } catch {}
  return { date: today, count: 0 };
}

function incrementUsage(): number {
  const today = new Date().toISOString().split("T")[0];
  const usage = getTodayUsage();
  const newCount = usage.date === today ? usage.count + 1 : 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: newCount }));
  return newCount;
}

interface ScheduleChange {
  day: string;
  summary: string;
  remove?: string[];
  add?: Array<Record<string, unknown>>;
  update?: Array<Record<string, unknown>>;
}

function parseScheduleChanges(content: string): ScheduleChange[] {
  const changes: ScheduleChange[] = [];
  // Match ```schedule-change blocks
  const regex1 = /```schedule-change\s*([\s\S]*?)```/g;
  let match;
  while ((match = regex1.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      changes.push(parsed);
    } catch {}
  }
  // Also match ```json blocks that contain schedule change data
  if (changes.length === 0) {
    const regex2 = /```json\s*([\s\S]*?)```/g;
    while ((match = regex2.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed.day && (parsed.add || parsed.remove || parsed.update)) {
          changes.push(parsed);
        }
      } catch {}
    }
  }
  return changes;
}

function stripScheduleBlocks(content: string): string {
  // Strip completed schedule-change blocks
  let stripped = content.replace(/```schedule-change\s*[\s\S]*?```/g, "");
  // Also strip incomplete blocks still streaming (opening fence with no closing fence)
  stripped = stripped.replace(/```schedule-change\s*[\s\S]*$/g, "");
  // Strip any other code blocks the AI might use for schedule JSON
  stripped = stripped.replace(/```json\s*\{[\s\S]*?"taskId"[\s\S]*?```/g, "");
  stripped = stripped.replace(/```json\s*\{[\s\S]*?"taskId"[\s\S]*$/g, "");
  return stripped.trim();
}

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: Id<"households">;
  initialPrompt?: string | null;
  onInitialPromptConsumed?: () => void;
}

export function AiSidebar({ isOpen, onClose, householdId, initialPrompt, onInitialPromptConsumed }: AiSidebarProps) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your HelperSync AI assistant 👋 I know all about your household setup. Ask me anything — from schedule suggestions to care routines. I can also adjust your helper's schedule directly!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [pendingChanges, setPendingChanges] = useState<{
    changes: ScheduleChange[];
    messageIndex: number;
  } | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (IS_DEV) {
      // Reset counter in dev mode
      localStorage.removeItem(STORAGE_KEY);
      setDailyCount(0);
    } else {
      setDailyCount(getTodayUsage().count);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingChanges]);

  // Handle initial prompt from dashboard card / chip — populate input, let user edit & send
  useEffect(() => {
    if (initialPrompt && isOpen) {
      setInput(initialPrompt);
      onInitialPromptConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, isOpen]);

  const sendMessage = async (overridePrompt?: string) => {
    const prompt = overridePrompt ?? input.trim();
    if (!prompt || isStreaming) return;

    if (dailyCount >= DAILY_LIMIT) {
      toast.error(`You've reached your daily limit of ${DAILY_LIMIT} AI chats. Try again tomorrow!`);
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: prompt };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);
    setPendingChanges(null);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const token = await getToken({ template: "convex" });
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          householdId,
          token,
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: assistantContent,
          };
          return updated;
        });
      }

      // Check for schedule changes in the response
      const changes = parseScheduleChanges(assistantContent);
      if (changes.length > 0) {
        setPendingChanges({
          changes,
          messageIndex: newMessages.length, // index of assistant message
        });
      }

      const newCount = incrementUsage();
      setDailyCount(newCount);
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, I had trouble responding. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleApplyChanges = useCallback(async () => {
    if (!pendingChanges) return;
    setIsApplying(true);

    try {
      const token = await getToken({ template: "convex" });
      const res = await fetch("/api/ai/apply-schedule-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          changes: pendingChanges.changes,
          token,
        }),
      });

      if (!res.ok) throw new Error("Failed to apply");

      toast.success("Schedule updated successfully!");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Done! I've updated the schedule. You can see the changes in your timetable view. ✅",
        },
      ]);
      setPendingChanges(null);
    } catch {
      toast.error("Failed to apply schedule changes. Please try again.");
    } finally {
      setIsApplying(false);
    }
  }, [pendingChanges, householdId, getToken]);

  const handleDeclineChanges = useCallback(() => {
    setPendingChanges(null);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "No problem! Feel free to adjust the schedule manually from the timetable view, or ask me for a different suggestion.",
      },
    ]);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const remaining = DAILY_LIMIT - dailyCount;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col md:static md:inset-auto md:z-auto md:w-80 md:border-l md:border-border md:flex-shrink-0 md:bg-white/80 md:backdrop-blur-md">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-400 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-display font-semibold text-gray-900 text-sm tracking-tight">HelperSync AI</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">{remaining}/{DAILY_LIMIT}</span>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => {
          const displayContent = msg.role === "assistant"
            ? stripScheduleBlocks(msg.content)
            : msg.content;

          return (
            <div
              key={i}
              className={cn(
                "flex gap-2 animate-fade-in-up",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {/* AI avatar */}
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-400 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-primary text-white rounded-br-md"
                    : "bg-gray-50 text-gray-800 rounded-bl-md border border-border"
                )}
              >
                {displayContent || (isStreaming && i === messages.length - 1 ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                  </span>
                ) : "")}
              </div>
            </div>
          );
        })}

        {/* Schedule change action buttons */}
        {pendingChanges && !isStreaming && (
          <div className="bg-gray-50 border border-border rounded-2xl p-3 space-y-2.5 animate-fade-in-up">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs font-semibold text-gray-900">
                Schedule changes proposed
              </p>
            </div>
            <div className="space-y-1.5 pl-9">
              {pendingChanges.changes.map((change, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold text-gray-800">{change.day.charAt(0).toUpperCase() + change.day.slice(1)}:</span> {change.summary}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleApplyChanges}
                disabled={isApplying}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {isApplying ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Yes, apply changes
              </button>
              <button
                onClick={handleDeclineChanges}
                disabled={isApplying}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white text-gray-600 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <XCircle className="w-3 h-3" />
                No thanks
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border flex-shrink-0">
        {remaining <= 0 ? (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">Daily limit reached ({DAILY_LIMIT}/{DAILY_LIMIT})</p>
            <p className="text-xs text-gray-400 mt-1">Resets tomorrow</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your household..."
                rows={2}
                className="flex-1 px-3 py-2 rounded-xl border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isStreaming}
                className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-400 text-center">
              {remaining} chats remaining today · Enter to send
            </p>
          </>
        )}
      </div>
    </div>
  );
}
