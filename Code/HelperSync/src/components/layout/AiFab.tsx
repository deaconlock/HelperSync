"use client";

import { Sparkles } from "lucide-react";
import { useAi } from "@/lib/ai-context";

export function AiFab() {
  const { openAi } = useAi();

  return (
    <button
      onClick={() => openAi()}
      className="fixed right-4 bottom-20 md:bottom-6 z-40 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center transition-all duration-200 active:scale-95"
      title="AI Assistant"
    >
      <Sparkles className="w-6 h-6" />
      {/* Subtle pulse ring */}
      <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-20 pointer-events-none" />
    </button>
  );
}
