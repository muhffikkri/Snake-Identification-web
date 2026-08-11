import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`shimmer rounded bg-gray-200 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="flex-shrink-0 w-36 h-[180px] bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between shadow-sm">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Skeleton className="w-12 h-4 rounded" />
          <Skeleton className="w-8 h-3 rounded" />
        </div>
        <Skeleton className="w-full h-20 rounded-lg" />
        <Skeleton className="w-24 h-4 rounded" />
        <Skeleton className="w-16 h-3 rounded" />
      </div>
      <div className="border-t border-gray-100 pt-2">
        <Skeleton className="w-full h-3 rounded" />
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="w-full h-64 bg-gray-100 rounded-xl border border-gray-200 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <Skeleton className="w-full h-full absolute inset-0 !rounded-none" />
      <div className="z-10 bg-white/95 px-4 py-3 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center space-y-2">
        <Skeleton className="w-32 h-4 rounded" />
        <Skeleton className="w-48 h-3 rounded" />
      </div>
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm space-y-2">
          <Skeleton className="w-20 h-3 rounded" />
          <Skeleton className="w-16 h-6 rounded" />
          <Skeleton className="w-24 h-3 rounded" />
        </div>
      ))}
    </div>
  );
}

export function TriageFormSkeleton() {
  return (
    <div className="w-full bg-white border border-gray-200 p-5 rounded-xl shadow-sm space-y-4">
      <div className="flex space-x-2">
        <Skeleton className="w-16 h-8 rounded-full" />
        <Skeleton className="w-20 h-8 rounded-full" />
      </div>
      <Skeleton className="w-40 h-5 rounded" />
      <div className="space-y-2">
        <Skeleton className="w-full h-10 rounded-lg" />
        <Skeleton className="w-full h-10 rounded-lg" />
        <Skeleton className="w-full h-10 rounded-lg" />
      </div>
      <div className="flex justify-between pt-4">
        <Skeleton className="w-24 h-10 rounded-lg" />
        <Skeleton className="w-24 h-10 rounded-lg" />
      </div>
    </div>
  );
}
