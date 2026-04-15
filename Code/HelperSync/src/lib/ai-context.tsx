"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface AiContextValue {
  isOpen: boolean;
  initialPrompt: string | null;
  openAi: (prompt?: string) => void;
  closeAi: () => void;
  toggleAi: () => void;
  consumePrompt: () => void;
}

const AiContext = createContext<AiContextValue>({
  isOpen: false,
  initialPrompt: null,
  openAi: () => {},
  closeAi: () => {},
  toggleAi: () => {},
  consumePrompt: () => {},
});

export function AiProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);

  const openAi = useCallback((prompt?: string) => {
    if (prompt) setInitialPrompt(prompt);
    setIsOpen(true);
  }, []);

  const closeAi = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleAi = useCallback(() => {
    setIsOpen((o) => !o);
  }, []);

  const consumePrompt = useCallback(() => {
    setInitialPrompt(null);
  }, []);

  return (
    <AiContext.Provider value={{ isOpen, initialPrompt, openAi, closeAi, toggleAi, consumePrompt }}>
      {children}
    </AiContext.Provider>
  );
}

export function useAi() {
  return useContext(AiContext);
}
