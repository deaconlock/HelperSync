"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";

interface PhotoUploadProps {
  onUpload: (file: File) => Promise<void>;
  onSkip: () => void;
  label: string;
}

export function PhotoUpload({ onUpload, onSkip, label }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleConfirm = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      await onUpload(selectedFile);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="space-y-3">
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-40 object-cover rounded-2xl"
            />
            <button
              onClick={() => { setPreview(null); setSelectedFile(null); }}
              className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={handleConfirm}
            disabled={isUploading}
            className="w-full py-3 bg-primary text-white rounded-2xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {isUploading ? "Uploading..." : "Confirm & Mark Done ✅"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 border-2 border-dashed border-primary text-primary rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-50 transition-colors"
        >
          <Camera className="w-5 h-5" />
          {label}
        </button>
      )}

      <button
        onClick={onSkip}
        className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        Mark done without photo
      </button>
    </div>
  );
}
