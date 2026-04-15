"use client";

import { useState, useEffect } from "react";
import { RefreshCw, MessageCircle, Copy, UserPlus } from "lucide-react";
import QRCode from "react-qr-code";
import { HelperDetails } from "@/types/household";
import { createInviteData, buildHelperWhatsAppMessage } from "@/lib/invite";
import { buildWhatsAppLink, formatInviteCode } from "@/lib/utils";
import { toast } from "sonner";

const NATIONALITY_OPTIONS = [
  "Philippines",
  "Indonesia",
  "Myanmar",
  "Sri Lanka",
  "India",
  "Bangladesh",
  "Cambodia",
  "Other",
];

import { LANGUAGES } from "@/lib/i18n";

interface Step5Props {
  helperDetails: HelperDetails | null;
  inviteCode: string;
  inviteQrData: string;
  helperHasPhone?: boolean | null;
  onUpdate: (details: HelperDetails, code: string, qrData: string) => void;
}

export function Step5HelperDetails({
  helperDetails,
  inviteCode,
  inviteQrData,
  helperHasPhone,
  onUpdate,
}: Step5Props) {
  const [details, setDetails] = useState<HelperDetails>(
    helperDetails ?? {
      name: "",
      nationality: "Philippines",
      phone: "",
      language: "en",
    }
  );
  const [code, setCode] = useState(inviteCode);
  const [qrData, setQrData] = useState(inviteQrData);

  useEffect(() => {
    if (!code) {
      const { code: newCode, url } = createInviteData();
      setCode(newCode);
      setQrData(url);
      onUpdate(details, newCode, url);
    }
  }, []);

  const updateDetails = (field: keyof HelperDetails, value: string) => {
    const updated = { ...details, [field]: value };
    setDetails(updated);
    onUpdate(updated, code, qrData);
  };

  const regenerate = () => {
    const { code: newCode, url } = createInviteData();
    setCode(newCode);
    setQrData(url);
    onUpdate(details, newCode, url);
    toast.success("New invite code generated!");
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const waMessage = buildHelperWhatsAppMessage(code, appUrl, details.name || "Helper", details.language);
  const waLink = buildWhatsAppLink(details.phone, waMessage);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success("Invite code copied!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <UserPlus className="w-8 h-8 text-gray-700" />
        </div>
        <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-1">Helper Details</h2>
        <p className="text-text-secondary text-sm max-w-md">
          Tell us about your helper and share the invite code with them.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Helper&apos;s Name
          </label>
          <input
            type="text"
            value={details.name}
            onChange={(e) => updateDetails("name", e.target.value)}
            placeholder="e.g. Maria Santos"
            className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nationality
          </label>
          <select
            value={details.nationality}
            onChange={(e) => updateDetails("nationality", e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white"
          >
            {NATIONALITY_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp Number
          </label>
          <input
            type="tel"
            value={details.phone}
            onChange={(e) => updateDetails("phone", e.target.value)}
            placeholder="+65 9123 4567"
            className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Language
          </label>
          <select
            value={details.language}
            onChange={(e) => updateDetails("language", e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeLabel} ({l.label})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Invite Code / No-phone section */}
      {helperHasPhone === false ? (
        <div className="bg-gray-50 rounded-2xl border border-border p-5 flex items-start gap-4">
          <span className="text-2xl flex-shrink-0">🖨️</span>
          <div>
            <p className="font-medium text-gray-900 mb-1">No app needed</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your helper won&apos;t need the app. Once your schedule is set, we&apos;ll generate a
              printable weekly checklist they can work from.
            </p>
          </div>
        </div>
      ) : code ? (
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h3 className="font-medium text-gray-900">Share with your helper</h3>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
            {/* QR Code */}
            <div className="flex-shrink-0 p-3 bg-white border border-border rounded-xl">
              <QRCode value={qrData} size={100} />
            </div>

            {/* Code + actions */}
            <div className="space-y-3 w-full sm:w-auto text-center sm:text-left">
              <div>
                <p className="text-xs text-gray-500 mb-1">6-character invite code</p>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-3xl font-mono font-semibold text-gray-900 tracking-widest">
                    {formatInviteCode(code)}
                  </span>
                  <button
                    onClick={copyCode}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={regenerate}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-text-secondary border border-border rounded-xl hover:bg-gray-50 transition-colors duration-200"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </button>

                {details.phone && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-white bg-green-500 rounded-xl hover:bg-green-600 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Share via WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
