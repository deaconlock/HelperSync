"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  useEffect(() => {
    // Redirect to onboarding with the code pre-filled
    router.replace(`/onboarding?code=${code}`);
  }, [code, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
