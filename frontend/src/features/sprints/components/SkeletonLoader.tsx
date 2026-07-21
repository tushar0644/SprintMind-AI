import React from "react";
import { Card } from "../../../components/ui/Card";

export const SkeletonLoader: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse select-none">
      {[1, 2, 3].map((i) => (
        <Card
          key={i}
          className="bg-white border border-stitch-outline-variant/60 rounded-3xl p-5 space-y-4 shadow-sm"
        >
          {/* Header Skeleton */}
          <div className="flex items-center justify-between border-b border-stitch-outline-variant/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-stitch-surface-container/70" />
              <div className="space-y-1">
                <div className="h-3.5 bg-stitch-surface-container/80 rounded w-24" />
                <div className="h-2.5 bg-stitch-surface-container/60 rounded w-16" />
              </div>
            </div>
            <div className="h-4 bg-stitch-surface-container/70 rounded w-14" />
          </div>

          {/* Metrics Skeleton */}
          <div className="grid grid-cols-2 gap-2.5 bg-stitch-surface-container/10 p-3 rounded-2xl border border-stitch-outline-variant/30">
            <div className="space-y-2">
              <div className="h-2 bg-stitch-surface-container/70 rounded w-12" />
              <div className="h-3 bg-stitch-surface-container/90 rounded w-16" />
              <div className="h-1.5 bg-stitch-surface-container/50 rounded w-full" />
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-stitch-surface-container/70 rounded w-12" />
              <div className="h-3 bg-stitch-surface-container/90 rounded w-16" />
              <div className="h-1.5 bg-stitch-surface-container/50 rounded w-full" />
            </div>
          </div>

          {/* Tasks Skeleton */}
          <div className="space-y-2.5 pt-2">
            <div className="flex justify-between items-center">
              <div className="h-3 bg-stitch-surface-container/70 rounded w-20" />
              <div className="h-3 bg-stitch-surface-container/60 rounded w-10" />
            </div>

            {[1, 2].map((t) => (
              <div
                key={t}
                className="p-3 bg-stitch-surface-container/10 border border-stitch-outline-variant/40 rounded-xl space-y-2"
              >
                <div className="h-3 bg-stitch-surface-container/80 rounded w-3/4" />
                <div className="flex justify-between items-center pt-1">
                  <div className="h-2.5 bg-stitch-surface-container/60 rounded w-12" />
                  <div className="h-2.5 bg-stitch-surface-container/60 rounded w-10" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
};
