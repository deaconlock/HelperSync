"use client";

import { ArrowRight, type LucideIcon } from "lucide-react";
import Image from "next/image";

interface FeatureHighlightScreenProps {
  icon: LucideIcon;
  title: string;
  body: string;
  image?: string;
  imageCrop?: string; // e.g. "90%" clips bottom 10% to remove watermarks
  onContinue: () => void;
}

export function FeatureHighlightScreen({ icon: Icon, title, body, image, imageCrop, onContinue }: FeatureHighlightScreenProps) {
  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6"
      style={{ animation: "screen-fade-in 0.4s ease-out both" }}
    >
      <div className="w-full max-w-sm">

        {/* Optional hero image */}
        {image && (
          <div
            className="rounded-3xl overflow-hidden mb-6 shadow-sm"
            style={{ animation: "fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both" }}
          >
            <Image
              src={image}
              alt={title}
              width={600}
              height={480}
              className="w-full object-cover object-top"
              style={imageCrop ? { clipPath: `inset(0 0 ${imageCrop} 0)`, marginBottom: `-${imageCrop}` } : undefined}
              priority
            />
          </div>
        )}

        {/* Card */}
        <div
          className="flex items-start gap-4 bg-white rounded-2xl shadow-sm p-5 mb-8"
          style={{ animation: `fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) ${image ? "0.22s" : "0.1s"} both` }}
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-base font-display font-semibold text-gray-900 mb-1">{title}</p>
            <p className="text-sm text-text-secondary leading-relaxed">{body}</p>
          </div>
        </div>

        <div style={{ animation: `fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) ${image ? "0.36s" : "0.22s"} both` }}>
          <button
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-xl font-display font-semibold text-base hover:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
