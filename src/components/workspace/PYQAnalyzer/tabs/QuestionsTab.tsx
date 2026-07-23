import React, { useState } from "react";
import { Sparkles, Brain, Award, Calendar, Tag, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui";
import AnswerGenerator from "../AnswerGenerator";
import { cn } from "@/lib/utils";
import type { PyqQuestion, PyqInsight } from "@/types/workspace";

interface QuestionsTabProps {
  questions: (PyqQuestion | string)[];
  answers: Record<string, string>;
  answerLoading: string | null;
  onGenerateAnswer: (question: string, marks?: number) => Promise<string>;
  onSendToAssistant: (insight: PyqInsight) => void;
}

export default function QuestionsTab({
  questions,
  answers,
  answerLoading,
  onGenerateAnswer,
  onSendToAssistant,
}: QuestionsTabProps) {
  const [activeQuestion, setActiveQuestion] = useState<PyqQuestion | null>(null);

  if (!questions || questions.length === 0) {
    return (
      <div className="text-center py-12 text-xs text-muted-foreground">
        No questions detected from PYQ papers yet.
      </div>
    );
  }

  // Normalize questions to structured PyqQuestion objects
  const normalizedQuestions: PyqQuestion[] = questions.map((q, i) => {
    if (typeof q === "string") {
      return {
        unit: `Unit ${((i % 4) + 1)}`,
        topic: "Core Concept",
        question: q,
        year: "2023",
        marks: 7,
        difficulty: "Medium",
      };
    }
    return q;
  });

  return (
    <div className="space-y-3">
      {/* Question Generator Overlay if open */}
      {activeQuestion && (
        <AnswerGenerator
          question={activeQuestion.question}
          defaultMarks={activeQuestion.marks}
          onGenerate={(q, m) => onGenerateAnswer(q, m)}
          onSendToAssistant={() =>
            onSendToAssistant({
              topic: activeQuestion.topic,
              question: activeQuestion.question,
              frequency: 3,
              avgMarks: activeQuestion.marks,
              years: [activeQuestion.year],
            })
          }
          onClose={() => setActiveQuestion(null)}
        />
      )}

      <div className="space-y-2.5">
        {normalizedQuestions.map((item, i) => {
          const difficultyColors = {
            Easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
            Medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
            Hard: "bg-destructive/10 text-destructive border-destructive/20",
          };

          return (
            <div
              key={i}
              className="p-3.5 rounded-xl border border-border bg-card hover:border-primary/40 transition-all space-y-2.5 shadow-sm"
            >
              {/* Card Tag Header */}
              <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                <div className="flex items-center gap-1.5 font-semibold text-primary">
                  <Tag className="w-3 h-3" />
                  <span>{item.unit}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-foreground">{item.topic}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" /> {item.year}
                  </span>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                    ⭐ {item.marks} Marks
                  </Badge>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                      difficultyColors[item.difficulty] || difficultyColors["Medium"]
                    )}
                  >
                    {item.difficulty}
                  </span>
                </div>
              </div>

              {/* Question Body */}
              <p className="text-xs font-semibold text-foreground leading-relaxed">
                Q{i + 1}. {item.question}
              </p>

              {/* Card Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] px-2.5"
                  onClick={() => setActiveQuestion(item)}
                >
                  <Sparkles className="w-3 h-3 text-primary" /> Generate {item.marks}-Mark Answer
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] px-2.5"
                  onClick={() =>
                    onSendToAssistant({
                      topic: item.topic,
                      question: item.question,
                      frequency: 3,
                      avgMarks: item.marks,
                      years: [item.year],
                    })
                  }
                >
                  <Brain className="w-3 h-3 text-accent" /> Ask Assistant
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
