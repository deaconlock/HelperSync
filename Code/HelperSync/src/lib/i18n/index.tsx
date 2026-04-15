"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { en } from "./en";
import { my } from "./my";
import { tl } from "./tl";
import { id } from "./id";

export type Language = "en" | "my" | "tl" | "id";

const strings: Record<Language, Record<string, string>> = { en, my, tl, id };

export const LANGUAGES: { code: Language; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "my", label: "Burmese", nativeLabel: "ဗမာစာ" },
  { code: "tl", label: "Tagalog", nativeLabel: "Tagalog" },
  { code: "id", label: "Bahasa Indonesia", nativeLabel: "Bahasa Indonesia" },
];

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({
  children,
  initialLanguage = "en",
}: {
  children: ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback(
    (key: string): string => {
      return strings[language][key] ?? strings.en[key] ?? key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
