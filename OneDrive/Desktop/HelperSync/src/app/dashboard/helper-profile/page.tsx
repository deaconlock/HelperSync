"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import QRCode from "react-qr-code";
import { RefreshCw, MessageCircle, Copy, CheckCircle2 } from "lucide-react";
import { createInviteData, buildHelperWhatsAppMessage } from "@/lib/invite";
import { buildWhatsAppLink, formatInviteCode } from "@/lib/utils";
import { toast } from "sonner";
import { HelperProfileSkeleton } from "@/components/ui/Skeleton";

export default function HelperProfilePage() {
  const household = useQuery(api.households.getMyHousehold);
  const helperSession = useQuery(
    api.helperSessions.getSessionByHousehold,
    household ? { householdId: household._id } : "skip"
  );
  const regenerateCode = useMutation(api.households.regenerateInviteCode);

  if (!household) return <HelperProfileSkeleton />;

  const helper = household.helperDetails;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const waMessage = helper
    ? buildHelperWhatsAppMessage(
        household.inviteCode,
        appUrl,
        helper.name,
        helper.language
      )
    : "";
  const waLink = helper ? buildWhatsAppLink(helper.phone, waMessage) : "";

  const handleRegenerate = async () => {
    const { code, url } = createInviteData();
    try {
      await regenerateCode({
        householdId: household._id,
        newCode: code,
        newQrData: url,
      });
      toast.success("New invite code generated!");
    } catch {
      toast.error("Failed to regenerate");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(household.inviteCode);
    toast.success("Invite code copied!");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <h1 className="text-2xl font-display font-semibold tracking-tight text-gray-900">Helper Profile</h1>

      {!helper ? (
        <div className="bg-white rounded-2xl border border-border p-6">
          <p className="text-text-muted">No helper details configured yet.</p>
        </div>
      ) : (
        <>
          {/* Helper info card */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">
                👤
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold tracking-tight text-gray-900">{helper.name}</h2>
                <p className="text-text-secondary">{helper.nationality}</p>
                <p className="text-sm text-text-muted mt-1">{helper.phone}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-lg">
                    {helper.language === "en" ? "English" :
                     helper.language === "my" ? "Burmese" :
                     helper.language === "tl" ? "Tagalog" :
                     helper.language === "id" ? "Bahasa Indonesia" : helper.language}
                  </span>
                  {helperSession && (
                    <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Joined HelperSync
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* WhatsApp reminder */}
            {helper.phone && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors w-fit"
                >
                  <MessageCircle className="w-4 h-4" />
                  Send WhatsApp Reminder
                </a>
              </div>
            )}
          </div>

          {/* Invite code card */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <h3 className="font-medium text-gray-900 mb-4">Invite Code</h3>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
              <div className="p-3 bg-white border border-border rounded-xl flex-shrink-0">
                <QRCode value={household.inviteQrData} size={100} />
              </div>
              <div className="space-y-3 w-full sm:w-auto text-center sm:text-left">
                <div>
                  <p className="text-xs text-text-muted mb-1">6-character code</p>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-3xl font-mono font-semibold text-gray-900 tracking-widest">
                      {formatInviteCode(household.inviteCode)}
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
                    onClick={handleRegenerate}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-text-secondary border border-border rounded-xl hover:bg-gray-50 transition-colors duration-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                  </button>
                  {helper.phone && (
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
        </>
      )}
    </div>
  );
}
