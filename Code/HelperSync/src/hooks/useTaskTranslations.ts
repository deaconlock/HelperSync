"use client";

import { useState, useEffect, useCallback } from "react";
import type { Language } from "@/lib/i18n";

const cache = new Map<string, Record<string, string>>();

export function useTaskTranslations(
  taskNames: string[],
  language: Language
) {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Stable key from task names
  const namesKey = taskNames.slice().sort().join("|");

  useEffect(() => {
    if (language === "en" || taskNames.length === 0) {
      setTranslations({});
      return;
    }

    const cacheKey = `${language}:${namesKey}`;

    if (cache.has(cacheKey)) {
      setTranslations(cache.get(cacheKey)!);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch("/api/ai/translate-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskNames, language }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const t = data.translations ?? {};
        cache.set(cacheKey, t);
        setTranslations(t);
      })
      .catch(() => {
        if (!cancelled) setTranslations({});
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [language, namesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const translateTask = useCallback(
    (name: string) => translations[name] ?? name,
    [translations]
  );

  return { translateTask, isTranslating: isLoading };
}
