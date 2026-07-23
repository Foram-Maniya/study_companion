import React from "react";
import { TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw, Sparkles, Target } from "lucide-react";
import type { PyqTrendItem } from "@/types/workspace";

interface TrendsTabProps {
  trends: PyqTrendItem[] | any[];
}

export default function TrendsTab({ trends }: TrendsTabProps) {
  if (!trends || trends.length === 0) {
    return (
      <div className="text-center py-12 text-xs text-muted-foreground">
        No trend analysis data available yet.
      </div>
    );
  }

  // Derive predicted topics and trend metrics from trend items
  const allTopics = trends.flatMap((t) => t.topics || []);
  const topicCounts: Record<string, number> = {};
  allTopics.forEach((t) => {
    topicCounts[t] = (topicCounts[t] || 0) + 1;
  });

  const sortedTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);
  const increasing = sortedTopics.slice(0, 2).map((x) => x[0]);
  const decreasing = sortedTopics.slice(-2).map((x) => x[0]);
  const repeated = sortedTopics.filter((x) => x[1] >= 2).map((x) => x[0]);
  const predicted = sortedTopics.slice(0, 3).map((x) => x[0]);

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-foreground flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-primary" /> Exam Trend Analysis & Predictions
        </h4>
      </div>

      {/* Predicted Exam Topics Highlight Box */}
      <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-2.5 shadow-sm">
        <div className="flex items-center gap-1.5 text-primary font-bold">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>Predicted Next Exam Topics</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Based on 2021–2025 recurrence patterns, these topics have high probability for the upcoming paper:
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {predicted.map((topic, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-bold text-xs flex items-center gap-1"
            >
              <Target className="w-3 h-3 text-amber-500" /> {topic}
            </span>
          ))}
        </div>
      </div>

      {/* Trend Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Increasing Trend */}
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <ArrowUpRight className="w-4 h-4" />
            <span>Topics Increasing in Weightage</span>
          </div>
          <div className="space-y-1">
            {increasing.map((t, i) => (
              <p key={i} className="text-xs font-semibold text-foreground">
                • {t}
              </p>
            ))}
          </div>
        </div>

        {/* Frequently Repeated */}
        <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-2">
          <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold">
            <RefreshCw className="w-4 h-4" />
            <span>Frequently Repeated Concepts</span>
          </div>
          <div className="space-y-1">
            {repeated.slice(0, 3).map((t, i) => (
              <p key={i} className="text-xs font-semibold text-foreground">
                • {t}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Yearly Trend Timeline */}
      <div className="p-3.5 rounded-xl border border-border bg-card space-y-3 shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Yearly Exam Topic Distribution
        </span>
        <div className="space-y-2.5">
          {trends.map((t: any, i: number) => (
            <div key={i} className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-1.5">
              <span className="font-bold text-primary text-xs">
                📅 Year {t.year}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(t.topics || []).map((topic: string, j: number) => (
                  <span
                    key={j}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
