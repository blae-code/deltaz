import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <Skeleton className="h-6 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-7 w-24 rounded-sm" />
          <Skeleton className="h-7 w-28 rounded-sm" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border border-border bg-card rounded-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-7 w-7 rounded-sm" />
              <Skeleton className="h-3 w-24 flex-1" />
            </div>
            <Skeleton className="h-8 w-2/3 mb-1" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>

      {/* Widget Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Large Widget Skeleton */}
        <div className="col-span-full">
          <Skeleton className="h-64 w-full rounded-sm" />
        </div>
        {/* Medium Widget Skeletons */}
        <Skeleton className="h-48 w-full rounded-sm" />
        <Skeleton className="h-48 w-full rounded-sm" />
        {/* Small Widget Skeletons */}
        <Skeleton className="h-32 w-full rounded-sm" />
        <Skeleton className="h-32 w-full rounded-sm" />
        <Skeleton className="h-32 w-full rounded-sm" />
      </div>
    </div>
  );
}