"use client";

import { useState, useEffect } from "react";
import { useSignUp, useAuth } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { Loader2, Mail, Lock, User as UserIcon, ArrowRight } from "lucide-react";
import Link from "next/link";

interface StepSignUpProps {
  onComplete: () => Promise<void>;
}

export function StepSignUp({ onComplete }: StepSignUpProps) {
  const { isSignedIn } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const isConvexAuthed = isAuthenticated ?? false;
  const { signUp, setActive, isLoaded } = useSignUp();

  const [phase, setPhase] = useState<"form" | "verifying" | "completing">("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-complete if already signed in and Convex has the auth token
  useEffect(() => {
    if (isSignedIn && isConvexAuthed && phase !== "completing") {
      setPhase("completing");
      onComplete();
    }
  }, [isSignedIn, isConvexAuthed]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEmailSignUp = async () => {
    if (!isLoaded || !signUp) return;
    setError("");
    setIsSubmitting(true);

    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPhase("verifying");
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded || !signUp) return;
    setError("");
    setIsSubmitting(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive!({ session: result.createdSessionId });
        setPhase("completing");
        // onComplete will be triggered by the useEffect above when isSignedIn becomes true
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Invalid code. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded || !signUp) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setError("");
    } catch {
      setError("Failed to resend code. Please try again.");
    }
  };

  const handleOAuthSignUp = async (strategy: "oauth_google" | "oauth_apple" | "oauth_facebook") => {
    if (!isLoaded || !signUp) return;
    try {
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/onboarding/employer?completing=true",
      });
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message || "Sign-up failed. Please try email instead.";
      setError(msg);
    }
  };

  if (phase === "completing") {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Setting up your household...</p>
      </div>
    );
  }

  if (phase === "verifying") {
    return (
      <div className="max-w-md mx-auto animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-2">
            Check your email
          </h2>
          <p className="text-text-secondary text-sm">
            We sent a verification code to <span className="font-medium text-gray-700">{email}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
              placeholder="Enter 6-digit code"
              maxLength={6}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-border text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            onClick={handleVerify}
            disabled={isSubmitting || code.length < 6}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
            ) : (
              <>Verify & Continue <ArrowRight className="w-4 h-4" /></>
            )}
          </button>

          <button
            onClick={handleResendCode}
            className="w-full py-2 text-sm text-gray-400 hover:text-primary transition-colors"
          >
            Didn&apos;t receive it? Resend code
          </button>
        </div>
      </div>
    );
  }

  // Main sign-up form
  return (
    <div className="max-w-md mx-auto animate-fade-in-up">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🎉</span>
        </div>
        <h2 className="text-2xl font-display font-semibold tracking-tight text-gray-900 mb-2">
          Your timetable is ready!
        </h2>
        <p className="text-text-secondary text-sm">
          Create a free account to save your personalized schedule
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6 space-y-5">
        {/* OAuth sign-up buttons */}
        <div className="space-y-2.5">
          <button
            onClick={() => handleOAuthSignUp("oauth_google")}
            className="w-full py-3 bg-white border border-border rounded-xl font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          <button
            onClick={() => handleOAuthSignUp("oauth_apple")}
            className="w-full py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-900 transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </button>
          <button
            onClick={() => handleOAuthSignUp("oauth_facebook")}
            className="w-full py-3 bg-[#1877F2] text-white rounded-xl font-medium hover:bg-[#166FE5] transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">or continue with email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email form */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">First Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last"
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@example.com"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Min 8 characters"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Clerk CAPTCHA element for bot protection */}
        <div id="clerk-captcha" className="flex justify-center" />

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <button
          onClick={handleEmailSignUp}
          disabled={isSubmitting || !email || password.length < 8}
          className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
          ) : (
            <>Create Account <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>

      {/* Sign-in link */}
      <div className="text-center mt-6">
        <Link
          href="/sign-in?redirect_url=/onboarding/employer?completing=true"
          className="text-sm text-gray-400 hover:text-primary transition-colors"
        >
          Already have an account? <span className="font-medium">Sign in</span>
        </Link>
      </div>
    </div>
  );
}
