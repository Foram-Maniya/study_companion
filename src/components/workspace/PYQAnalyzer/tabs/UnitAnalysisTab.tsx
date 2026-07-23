import React, { useState } from "react";
import { Layers, ChevronDown, ChevronUp, Award, Target, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { PyqQuestion } from "@/types/workspace";

interface UnitAnalysisTabProps {
  questions: PyqQuestion[] | any[];
}

export default function UnitAnalysisTab({ questions }: UnitAnalysisTabProps) {
  const [expandedUnit, setExpandedUnit] = useState<string | null>("Unit 1");

  // Group questions by Unit
  const unitsMap: Record<string, { questions: any[]; totalMarks: number }> = {};

  (questions || []).forEach((q, i) => {
    const unitName =
      typeof q === "object" && q.unit ? q.unit : `Unit ${((i % 4) + 1)}`;
    const marks = typeof q === "object" && q.marks ? q.marks : 7;
    const qText = typeof q === "string" ? q : q.question;

    if (!unitsMap[unitName]) {
      unitsMap[unitName] = { questions: [], totalMarks: 0 };
    }
    unitsMap[unitName].questions.push({ ...q, question: qText, marks });
    unitsMap[unitName].totalMarks += marks;
  });

  const unitKeys = Object.keys(unitsMap).sort();

  if (unitKeys.length === 0) {
    return (
      <div className="text-center py-12 text-xs text-muted-foreground">
        No unit analysis available yet.
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-foreground flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-primary" /> Syllabus Unit-wise Exam Weightage
        </h4>
        <span className="text-[11px] text-muted-foreground">
          {unitKeys.length} Syllabus Units Analyzed
        </span>
      </div>

      <div className="space-y-2.5">
        {unitKeys.map((unitKey) => {
          const unitData = unitsMap[unitKey];
          const isExpanded = expandedUnit === unitKey;
          const isHighWeightage = unitData.totalMarks >= 20;

          return (
            <div
              key={unitKey}
              className="rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-all"
            >
              {/* Unit Accordion Header */}
              <button
                onClick={() => setExpandedUnit(isExpanded ? null : unitKey)}
                className="w-full p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                      isHighWeightage
                        ? "bg-destructive/10 text-destructive border border-destructive/20"
                        : "bg-primary/10 text-primary border border-primary/20"
                    )}
                  >
                    {unitKey.replace("Unit ", "U")}
                  </div>
                  <div>
                    <h5 className="font-bold text-foreground text-xs">{unitKey}</h5>
                    <p className="text-[11px] text-muted-foreground">
                      {unitData.questions.length} Questions Asked · Total Weightage:{" "}
                      <strong className="text-foreground">{unitData.totalMarks} Marks</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isHighWeightage ? (
                    <Badge className="bg-destructive/10 text-destructive text-[10px]">
                      🔥 High Weightage
                    </Badge>
                  ) : (
                    <Badge className="bg-primary/10 text-primary text-[10px]">
                      ⭐ Standard
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Unit Questions List */}
              {isExpanded && (
                <div className="p-3.5 pt-0 space-y-2 border-t border-border/50 bg-muted/10">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-2">
                    Questions Appearing from {unitKey}:
                  </p>
                  {unitData.questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-border bg-background space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-primary">
                          Topic: {q.topic || "Core Topic"}
                        </span>
                        <span className="font-bold text-foreground">{q.marks} Marks</span>
                      </div>
                      <p className="text-xs text-foreground font-medium">
                        Q{idx + 1}. {q.question}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
