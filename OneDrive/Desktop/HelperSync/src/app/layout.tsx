import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { ThemeProvider } from "@/lib/theme-context";
import { Toaster } from "sonner";
import { DevResetButton } from "@/components/layout/DevResetButton";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "HelperSync — Household Helper Management",
  description:
    "AI-powered household helper management for Singapore families. Coordinate tasks, schedules, and care routines seamlessly.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} ${jakarta.variable} bg-background dark:bg-gray-950 antialiased font-sans`}>
          <ThemeProvider>
            <ConvexClientProvider>
              {children}
              <Toaster position="top-right" richColors />
              <DevResetButton />
            </ConvexClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
