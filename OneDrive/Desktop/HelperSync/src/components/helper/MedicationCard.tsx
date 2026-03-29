"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { HouseholdMember } from "@/types/household";
import { CheckCircle2, Pill, Camera, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MedicationCardProps {
  elderlyMembers: HouseholdMember[];
  householdId: Id<"households">;
  date: string;
}

export function MedicationCard({ elderlyMembers, householdId, date }: MedicationCardProps) {
  const medLogs = useQuery(api.medicationLogs.getLogsForDate, { householdId, date });
  const logMedication = useMutation(api.medicationLogs.logMedication);
  const generateUploadUrl = useMutation(api.taskLogs.generateUploadUrl);

  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const membersWithMeds = elderlyMembers.filter((m) => m.medications?.trim());
  if (membersWithMeds.length === 0) return null;

  const completedNames = new Set(medLogs?.map((l) => l.memberName) ?? []);
  const allDone = membersWithMeds.every((m) => completedNames.has(m.name));

  const handleConfirmMed = async (memberName: string, withPhoto?: boolean) => {
    setIsUploading(true);
    try {
      let photoUrl: string | undefined;
      if (withPhoto && selectedFile) {
        const url = await generateUploadUrl();
        const result = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });
        const { storageId } = await result.json();
        photoUrl = storageId;
      }

      await logMedication({ householdId, date, memberName, photoUrl });
    } finally {
      setIsUploading(false);
      setUploadingFor(null);
      setPreview(null);
      setSelectedFile(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const startPhotoFor = (memberName: string) => {
    setUploadingFor(memberName);
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden transition-all",
      allDone ? "bg-emerald-50/50 border-emerald-200" : "bg-rose-50/50 border-rose-200"
    )}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5"
      >
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center",
          allDone ? "bg-emerald-100" : "bg-rose-100"
        )}>
          <Pill className={cn("w-5 h-5", allDone ? "text-emerald-600" : "text-rose-600")} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-gray-900">Medication Checklist</p>
          <p className="text-xs text-gray-500">
            {completedNames.size}/{membersWithMeds.length} confirmed today
          </p>
        </div>
        {allDone && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-400 transition-transform",
          expanded && "rotate-180"
        )} />
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {membersWithMeds.map((member) => {
            const isDone = completedNames.has(member.name);
            const log = medLogs?.find((l) => l.memberName === member.name);
            const isPhotoMode = uploadingFor === member.name;

            return (
              <div
                key={member.name}
                className={cn(
                  "rounded-xl p-3 transition-all",
                  isDone ? "bg-white/60 border border-emerald-100" : "bg-white border border-gray-100"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">👴</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      isDone ? "text-gray-400 line-through" : "text-gray-900"
                    )}>
                      {member.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{member.medications}</p>
                    {log?.photoDisplayUrl && (
                      <img
                        src={log.photoDisplayUrl}
                        alt="Medication proof"
                        className="w-16 h-16 rounded-lg object-cover mt-2 ring-1 ring-gray-200"
                      />
                    )}
                  </div>
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => startPhotoFor(member.name)}
                        className="p-2 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                        title="Take photo proof"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleConfirmMed(member.name)}
                        disabled={isUploading}
                        className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>

                {/* Photo capture inline */}
                {isPhotoMode && !isDone && (
                  <div className="mt-3 space-y-2">
                    {preview ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <img src={preview} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                          <button
                            onClick={() => { setPreview(null); setSelectedFile(null); setUploadingFor(null); }}
                            className="absolute top-1.5 right-1.5 p-1 bg-black/50 text-white rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleConfirmMed(member.name, true)}
                          disabled={isUploading}
                          className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
                        >
                          {isUploading ? "Uploading..." : "Confirm with Photo"}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center">Opening camera...</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
