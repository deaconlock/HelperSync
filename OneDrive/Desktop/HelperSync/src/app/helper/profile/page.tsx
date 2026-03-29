"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useTranslation, LANGUAGES, Language } from "@/lib/i18n";
import { useClerk } from "@clerk/nextjs";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LogOut, Lock } from "lucide-react";
import bcrypt from "bcryptjs";
import { HelperHomeSkeleton } from "@/components/ui/Skeleton";

export default function HelperProfilePage() {
  const { t, language, setLanguage } = useTranslation();
  const { signOut } = useClerk();
  const session = useQuery(api.helperSessions.getMySession);
  const updateLanguage = useMutation(api.helperSessions.updateLanguage);
  const updatePin = useMutation(api.helperSessions.updatePin);

  const [showPinChange, setShowPinChange] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");

  if (!session) return <HelperHomeSkeleton />;

  const handleLanguageChange = async (lang: Language) => {
    setLanguage(lang);
    try {
      await updateLanguage({ language: lang });
    } catch {
      // ignore
    }
  };

  const handlePinChange = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError("PIN must be exactly 4 digits");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("PINs don't match");
      return;
    }

    const isCurrentValid = await bcrypt.compare(currentPin, session.pinHash);
    if (!isCurrentValid) {
      setPinError("Current PIN is incorrect");
      return;
    }

    try {
      const hash = await bcrypt.hash(newPin, 10);
      await updatePin({ pinHash: hash });
      toast.success("PIN updated successfully!");
      setShowPinChange(false);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setPinError("");
    } catch {
      toast.error("Failed to update PIN");
    }
  };

  return (
    <div className="pt-6 space-y-5 animate-fade-in-up">
      <h1 className="text-2xl font-display font-semibold tracking-tight text-gray-900">{t("profile")}</h1>

      {/* Language switcher */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <h2 className="font-medium text-gray-900 mb-3">{t("language")}</h2>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={cn(
                "py-3 px-4 rounded-2xl text-sm font-semibold transition-colors text-left",
                language === lang.code
                  ? "bg-primary text-white"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              )}
            >
              <div>{lang.nativeLabel}</div>
              <div className={cn("text-xs mt-0.5", language === lang.code ? "text-primary-100" : "text-gray-400")}>
                {lang.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* PIN change */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-gray-900">{t("change_pin")}</h2>
          <Lock className="w-4 h-4 text-gray-400" />
        </div>

        {showPinChange ? (
          <div className="space-y-3">
            {[
              { label: "Current PIN", value: currentPin, onChange: setCurrentPin },
              { label: "New PIN (4 digits)", value: newPin, onChange: setNewPin },
              { label: "Confirm New PIN", value: confirmPin, onChange: setConfirmPin },
            ].map(({ label, value, onChange }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={value}
                  onChange={(e) => { onChange(e.target.value); setPinError(""); }}
                  className="w-full px-4 py-3 rounded-xl border border-border text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
            ))}
            {pinError && <p className="text-red-500 text-sm">{pinError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setShowPinChange(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handlePinChange}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium"
              >
                Save PIN
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowPinChange(true)}
            className="w-full py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t("change_pin")}
          </button>
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={() => signOut({ redirectUrl: "/sign-in" })}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-border text-red-500 font-medium hover:bg-red-50 transition-colors duration-200"
      >
        <LogOut className="w-4 h-4" />
        {t("sign_out")}
      </button>
    </div>
  );
}
