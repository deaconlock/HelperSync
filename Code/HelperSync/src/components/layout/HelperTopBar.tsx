"use client";

import { useTranslation, LANGUAGES } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";
import Link from "next/link";
import { format } from "date-fns";
import { User, ArrowLeft, Globe } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useState } from "react";

export function HelperTopBar({ showBackToDashboard = false }: { showBackToDashboard?: boolean }) {
  const { language, setLanguage } = useTranslation();
  const [showLangMenu, setShowLangMenu] = useState(false);

  return (
    <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
      <div>
        <Logo size="sm" href="/helper" />
        <p className="text-xs text-gray-400 mt-0.5">{format(new Date(), "EEEE, d MMMM")}</p>
      </div>
      <div className="flex items-center gap-2">
        {showBackToDashboard && (
          <Link
            href="/dashboard"
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        )}

        {/* Language switcher */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu((s) => !s)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">
              {LANGUAGES.find((l) => l.code === language)?.nativeLabel ?? "English"}
            </span>
          </button>
          {showLangMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowLangMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 min-w-[180px]">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code as Language);
                      setShowLangMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${
                      language === lang.code ? "text-primary font-semibold" : "text-gray-700"
                    }`}
                  >
                    <span>{lang.nativeLabel}</span>
                    {language === lang.code && <span className="text-primary">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {!showBackToDashboard && (
          <Link
            href="/helper/profile"
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <User className="w-5 h-5" />
          </Link>
        )}
      </div>
    </header>
  );
}
