"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: "text-base" },
    md: { icon: 28, text: "text-lg" },
    lg: { icon: 36, text: "text-2xl" },
  };

  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Logomark: house outline with sync arrows */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* House shape */}
        <path
          d="M18 3L3 15V31C3 32.1 3.9 33 5 33H13V23H23V33H31C32.1 33 33 32.1 33 31V15L18 3Z"
          fill="currentColor"
          fillOpacity="0.06"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-900 dark:text-slate-100"
        />
        {/* Sync arrow 1 (clockwise, top) */}
        <path
          d="M13 16.5C13 14.5 14.8 13 17 13H20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-slate-900 dark:text-slate-100"
        />
        <path
          d="M19 10.5L21.5 13L19 15.5"
          stroke="#0D9488"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Sync arrow 2 (counter-clockwise, bottom) */}
        <path
          d="M23 19.5C23 21.5 21.2 23 19 23H16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-slate-900 dark:text-slate-100"
        />
        <path
          d="M17 25.5L14.5 23L17 20.5"
          stroke="#0D9488"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showText && (
        <span className={cn("font-semibold tracking-tight text-gray-900", s.text)}>
          Helper<span className="font-normal text-text-secondary">Sync</span>
        </span>
      )}
    </div>
  );
}
