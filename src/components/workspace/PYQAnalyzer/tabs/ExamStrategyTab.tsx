import React from "react";
import { Sparkles, Clock, Target, CheckCircle2, ShieldAlert, Award } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ExamStrategyTabProps {
  questions: any[];
  frequency: any[];
}

export default function ExamStrategyTab({
  questions,
  frequency,
}: ExamStrategyTabProps) {
  const strategySteps = [
    {
      phase: "Phase 1: High-Yield Focus (Days 1–2)",
      desc: "Master top 20% topics that account for 60%+ of total exam marks.",
      icon: Target,
      color: "border-destructive/30 bg-destructive/5 text-destructive",
      actions: [
        "Prepare 7-mark and 10-mark answers for top 3 repeated algorithms",
        "Memorize core definitions and draw clean flowcharts",
      ],
    },
    {
      phase: "Phase 2: Unit Weightage Coverage (Day 3)",
      desc: "Ensure minimum passing weightage is secured across all syllabus units.",
      icon: Award,
      color: "border-primary/30 bg-primary/5 text-primary",
      actions: [
        "Focus heavily on Units with >20 marks weightage",
        "Solve 4-mark short explanation questions for secondary units",
      ],
    },
    {
      phase: "Phase 3: Time Allocation & Mock Viva (Day 4)",
      desc: "Simulate exam timing and practice quick recall under pressure.",
      icon: Clock,
      color: "border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400",
      actions: [
        "Allocate 25 mins per 10-mark question; 15 mins per 7-mark question",
        "Use Mock Viva mode in Study Assistant to test verbal recall",
      ],
    },
  ];

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-foreground flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" /> Personalized Exam Strategy & Game Plan
        </h4>
        <span className="text-[11px] text-muted-foreground">AI-Calibrated Study Plan</span>
      </div>

      {/* Summary Box */}
      <div className="p-4 rounded-2xl border border-primary/30 bg-card shadow-sm space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
          Strategic Overview
        </span>
        <p className="text-xs text-foreground leading-relaxed">
          Based on our PYQ pattern analysis, <strong>70% of exam marks</strong> are concentrated in 3 primary syllabus topics. Follow this phased preparation strategy to maximize score efficiency in minimum study time.
        </p>
      </div>

      {/* Phased Strategy Cards */}
      <div className="space-y-3">
        {strategySteps.map((step, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl border space-y-2.5 shadow-xs ${step.color}`}
          >
            <div className="flex items-center gap-2 font-bold text-xs">
              <step.icon className="w-4 h-4 shrink-0" />
              <span>{step.phase}</span>
            </div>
            <p className="text-xs opacity-90 leading-relaxed">{step.desc}</p>
            <ul className="space-y-1 text-xs pt-1">
              {step.actions.map((act, j) => (
                <li key={j} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
