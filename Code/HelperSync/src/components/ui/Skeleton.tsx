import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-skeleton rounded-xl bg-gray-100",
        className
      )}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Greeting */}
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Hero card */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <div className="flex items-center gap-6">
          <Skeleton className="w-24 h-24 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center space-y-1">
                  <Skeleton className="h-6 w-8 mx-auto" />
                  <Skeleton className="h-3 w-10 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI card */}
      <Skeleton className="h-24 rounded-2xl" />

      {/* Task list */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 mb-3" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function LeaveSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-8 w-48" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-5 space-y-4">
          {/* Month nav */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-4 w-8 mx-auto" />
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-9 rounded-xl" />
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Skeleton className="w-3 h-3 rounded-sm" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-border p-5">
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
            <Skeleton className="h-5 w-36 mb-3" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-20 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HelperProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Skeleton className="h-8 w-40" />

      {/* Helper info card */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="w-14 h-14 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-6 w-20 rounded-lg" />
              <Skeleton className="h-6 w-32 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Invite code card */}
      <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
        <Skeleton className="h-5 w-24" />
        <div className="flex gap-6 items-start">
          <Skeleton className="w-[124px] h-[124px] rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-xl" />
              <Skeleton className="h-9 w-40 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HelperHomeSkeleton() {
  return (
    <div className="pt-6 space-y-5">
      {/* Greeting */}
      <div>
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Day selector */}
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="w-14 h-16 rounded-2xl" />
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-border p-4 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Task cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function TimetableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-8 w-48 rounded-xl" />
      </div>

      {/* Day selector (mobile) */}
      <div className="flex gap-1.5 md:hidden">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-14 w-12 rounded-xl flex-shrink-0" />
        ))}
      </div>

      {/* Grid */}
      <div className="hidden md:grid grid-cols-7 gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-5 w-full rounded-lg" />
            {[1, 2, 3, 4].map((j) => (
              <Skeleton key={j} className="h-16 rounded-xl" />
            ))}
          </div>
        ))}
      </div>

      {/* Mobile single column */}
      <div className="md:hidden space-y-1.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
