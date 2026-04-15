"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  href?: string;
}

export function Logo({ size = "md", showText = true, className, href }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: "text-base" },
    md: { icon: 28, text: "text-lg" },
    lg: { icon: 36, text: "text-2xl" },
    xl: { icon: 80, text: "text-4xl" },
  };

  const s = sizes[size];

  const inner = (
    <div className={cn("flex items-center gap-2", href && "cursor-pointer", className)}>
      <Image
        src="/images/logo.jpg"
        alt="HelperSync logo"
        width={s.icon}
        height={s.icon}
        className="flex-shrink-0"
      />
      {showText && (
        <span className={cn("font-semibold tracking-tight text-gray-900", s.text)}>
          Helper<span className="font-normal text-text-secondary">Sync</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}
