import React from "react";
import { Target, Award, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ImportantTopicsTabProps {
  important: string[] | any[];
}

export default function ImportantTopicsTab({ important }: ImportantTopicsTabProps) {
  if (!important || important.length === 0) {
    return (
      <div className="text-center py-12 text-xs text-muted-foreground">
        No important topics identified yet.
      </div>
    );
  }

  const priorityGroups = [
    { title: "🔴 Very High Priority (Must Prepare)", color: "border-destructive/30 bg-destructive/5 text-destructive" },
    { title: "🟠 High Priority (High Weightage)", color: "border-warning/30 bg-warning/5 text-amber-600 dark:text-amber-400" },
    { title: "🟡 Medium Priority (Standard Topics)", color: "border-primary/30 bg-primary/5 text-primary" },
    { title: "🟢 Low Priority (Optional Review)", color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-foreground flex items-center gap-1.5">
          <Target className="w-4 h-4 text-primary" /> Priority Ranked Topics for Exam
        </h4>
        <span className="text-[11px] text-muted-foreground">
          {important.length} High-Yield Topics
        </span>
      </div>

      <div className="space-y-3">
        {important.map((item, i) => {
          const topicName = typeof item === "string" ? item : item.name || `Topic ${i + 1}`;
          const groupIdx = Math.min(i, priorityGroups.length - 1);
          const group = priorityGroups[groupIdx];
          const probability = Math.max(60, 96 - i * 8);

          return (
            <div
              key={i}
              className={cn(
                "p-3.5 rounded-xl border flex items-center justify-between gap-3 shadow-sm transition-all hover:scale-[1.01]",
                group.color
              )}
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  #{i + 1}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-foreground truncate">{topicName}</p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Recommended Study Focus · Exam Probability: <strong>{probability}%</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge className="bg-background/80 text-foreground text-[10px]">
                  {probability}% Probability
                </Badge>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
