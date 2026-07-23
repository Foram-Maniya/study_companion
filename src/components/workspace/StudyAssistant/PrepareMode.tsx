import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  HelpCircle,
  FileQuestion,
  Zap,
  BookOpen,
  RotateCw,
  MessageSquare,
  Award,
  Send,
  Loader2,
  CheckCircle2,
  Sparkles,
  FileText,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, Skeleton } from "@/components/ui";
import RevisionSheet from "./RevisionSheet";
import FlashCards from "./FlashCards";
import { renderMarkdown } from "@/lib/markdownRenderer";
import { cn } from "@/lib/utils";
import type {
  PrepareSubMode,
  QuizType,
  RevisionData,
  Flashcard,
} from "@/types/workspace";

interface PrepareModeProps {
  mode: PrepareSubMode;
  setMode: (m: PrepareSubMode) => void;
  // Doubt solver
  doubtInput: string;
  setDoubtInput: (v: string) => void;
  onDoubt: () => void;
  doubtAnswer: string | null;
  doubtLoading: boolean;
  // Quiz
  quiz: any[];
  quizLoading: boolean;
  quizAnswers: Record<number, string>;
  setQuizAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  quizSubmitted: boolean;
  setQuizSubmitted: (v: boolean) => void;
  onGenerateQuiz: (type: QuizType) => void;
  // Short/Long Questions
  essayQuestions: any[];
  essayLoading: boolean;
  onGenerateEssayQs: (markType: "short" | "long") => void;
  // Flashcards
  flashcards: Flashcard[];
  flashcardLoading: boolean;
  onGenerateFlashcards: () => void;
  // Viva
  vivaQ: string | null;
  vivaHistory: { q: string; a: string; feedback?: string }[];
  vivaInput: string;
  setVivaInput: (v: string) => void;
  vivaLoading: boolean;
  onStartViva: () => void;
  onSubmitVivaAnswer: () => void;
  // Revision
  revision: RevisionData | null;
  revisionLoading: boolean;
  onRevision: () => void;
  onSendToChat?: (q: string) => void;
}

export default function PrepareMode({
  mode,
  setMode,
  doubtInput,
  setDoubtInput,
  onDoubt,
  doubtAnswer,
  doubtLoading,
  quiz,
  quizLoading,
  quizAnswers,
  setQuizAnswers,
  quizSubmitted,
  setQuizSubmitted,
  onGenerateQuiz,
  essayQuestions,
  essayLoading,
  onGenerateEssayQs,
  flashcards,
  flashcardLoading,
  onGenerateFlashcards,
  vivaQ,
  vivaHistory,
  vivaInput,
  setVivaInput,
  vivaLoading,
  onStartViva,
  onSubmitVivaAnswer,
  revision,
  revisionLoading,
  onRevision,
  onSendToChat,
}: PrepareModeProps) {
  const modes: { id: PrepareSubMode; label: string; icon: any }[] = [
    { id: "doubt", label: "Doubt Solver", icon: HelpCircle },
    { id: "mcq", label: "MCQ Quiz", icon: FileQuestion },
    { id: "short", label: "Short Qs (2-4M)", icon: FileText },
    { id: "long", label: "Long Qs (7-10M)", icon: Award },
    { id: "flashcard", label: "Flashcards", icon: RotateCw },
    { id: "viva", label: "Mock Viva", icon: MessageSquare },
    { id: "revision", label: "Revision Sheet", icon: Zap },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 7-Submode Horizontal Tab Strip */}
      <div className="flex items-center gap-1 p-2 border-b border-border overflow-x-auto scrollbar-thin bg-muted/20 shrink-0">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors",
              mode === m.id
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:bg-secondary"
            )}
          >
            <m.icon className="w-3.5 h-3.5" />
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Mode Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {/* 1. Doubt Solver */}
        {mode === "doubt" && (
          <div className="space-y-4 max-w-lg mx-auto">
            <div className="text-center py-4">
              <HelpCircle className="w-10 h-10 text-primary mx-auto mb-2" />
              <h3 className="text-base font-bold">Instant Doubt Solver</h3>
              <p className="text-xs text-muted-foreground">
                Stuck on a tricky concept or equation? Ask any doubt to get a clear explanation.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                value={doubtInput}
                onChange={(e) => setDoubtInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onDoubt()}
                placeholder="Type your specific doubt..."
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button onClick={onDoubt} loading={doubtLoading} disabled={!doubtInput.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {doubtLoading && (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground animate-pulse">Solving doubt...</span>
              </div>
            )}

            {doubtAnswer && !doubtLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-card p-4 text-sm space-y-1 shadow-sm"
              >
                {renderMarkdown(doubtAnswer)}
              </motion.div>
            )}
          </div>
        )}

        {/* 2. MCQ Quiz */}
        {mode === "mcq" && (
          <div className="space-y-4 max-w-xl mx-auto">
            <div className="text-center py-2">
              <FileQuestion className="w-10 h-10 text-primary mx-auto mb-2" />
              <h3 className="text-base font-bold">Multiple Choice Quiz</h3>
              <p className="text-xs text-muted-foreground">Test your readiness with AI-generated MCQs.</p>
            </div>

            {quiz.length === 0 && !quizLoading && (
              <Button onClick={() => onGenerateQuiz("mcq")} variant="gradient" className="w-full">
                <Sparkles className="w-4 h-4" /> Generate MCQ Quiz
              </Button>
            )}

            {quizLoading && (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            )}

            {quiz.length > 0 && !quizLoading && (
              <div className="space-y-4">
                {quiz.map((q: any, i: number) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
                    <p className="text-sm font-semibold text-foreground">
                      Q{i + 1}. {q.question}
                    </p>

                    {q.options && (
                      <div className="space-y-2">
                        {q.options.map((opt: string, j: number) => {
                          const isSelected = quizAnswers[i] === opt;
                          const isCorrect = quizSubmitted && opt === q.answer;
                          const isWrong = quizSubmitted && isSelected && opt !== q.answer;
                          return (
                            <button
                              key={j}
                              onClick={() => !quizSubmitted && setQuizAnswers({ ...quizAnswers, [i]: opt })}
                              className={cn(
                                "w-full text-left text-xs px-3 py-2.5 rounded-lg border transition-all flex items-center justify-between",
                                isCorrect
                                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold"
                                  : isWrong
                                  ? "bg-destructive/10 border-destructive text-destructive"
                                  : isSelected
                                  ? "bg-primary/10 border-primary font-medium"
                                  : "border-border hover:bg-secondary"
                              )}
                            >
                              <span>{opt}</span>
                              {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {quizSubmitted && q.explanation && (
                      <p className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border">
                        <strong>Explanation:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                ))}

                {!quizSubmitted ? (
                  <Button onClick={() => setQuizSubmitted(true)} variant="gradient" className="w-full">
                    Submit Quiz & View Score
                  </Button>
                ) : (
                  <div className="text-center py-4 bg-secondary/50 rounded-xl border border-border">
                    <p className="text-base font-bold">
                      Your Score:{" "}
                      {Object.entries(quizAnswers).filter(([i, a]) => a === quiz[parseInt(i)].answer).length} / {quiz.length}
                    </p>
                    <Button onClick={() => onGenerateQuiz("mcq")} variant="outline" className="mt-3">
                      Try Another Quiz
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3 & 4. Short / Long Questions */}
        {(mode === "short" || mode === "long") && (
          <div className="space-y-4 max-w-xl mx-auto">
            <div className="text-center py-2">
              <Award className="w-10 h-10 text-primary mx-auto mb-2" />
              <h3 className="text-base font-bold">
                {mode === "short" ? "Short Exam Questions (2-4 Marks)" : "Long Essay Questions (7-10 Marks)"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Practice university exam questions calibrated to mark schemes.
              </p>
            </div>

            {essayQuestions.length === 0 && !essayLoading && (
              <Button onClick={() => onGenerateEssayQs(mode)} variant="gradient" className="w-full">
                <Sparkles className="w-4 h-4" /> Generate {mode === "short" ? "2-4 Mark" : "7-10 Mark"} Questions
              </Button>
            )}

            {essayLoading && (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-xl" />
                ))}
              </div>
            )}

            {essayQuestions.length > 0 && !essayLoading && (
              <div className="space-y-4">
                {essayQuestions.map((q: any, i: number) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                        {q.marks || (mode === "short" ? 4 : 7)} Marks
                      </span>
                      {q.unit && <span className="text-[11px] text-muted-foreground">{q.unit}</span>}
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      Q{i + 1}. {q.question}
                    </p>

                    {q.modelAnswer && (
                      <div className="mt-2 rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                        <span className="font-bold text-foreground">Model Answer Scheme:</span>
                        <div>{renderMarkdown(q.modelAnswer)}</div>
                      </div>
                    )}

                    {onSendToChat && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => onSendToChat(`Explain full university answer for question: "${q.question}" for ${q.marks || 7} marks.`)}
                      >
                        Ask AI for Full Answer
                      </Button>
                    )}
                  </div>
                ))}
                <Button onClick={() => onGenerateEssayQs(mode)} variant="outline" className="w-full">
                  Generate More Questions
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 5. Flashcards */}
        {mode === "flashcard" && (
          <FlashCards
            cards={flashcards}
            loading={flashcardLoading}
            onGenerate={onGenerateFlashcards}
          />
        )}

        {/* 6. Mock Viva */}
        {mode === "viva" && (
          <div className="space-y-4 max-w-xl mx-auto">
            <div className="text-center py-2">
              <MessageSquare className="w-10 h-10 text-purple-500 mx-auto mb-2" />
              <h3 className="text-base font-bold">Interactive Mock Viva</h3>
              <p className="text-xs text-muted-foreground">
                Simulate an examiner viva session. AI asks questions & evaluates your answers live.
              </p>
            </div>

            {!vivaQ && (
              <Button onClick={onStartViva} loading={vivaLoading} variant="gradient" className="w-full">
                <Sparkles className="w-4 h-4" /> Start Viva Session
              </Button>
            )}

            {vivaQ && (
              <div className="space-y-4">
                {/* Examiner Question Box */}
                <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Examiner Question:
                  </span>
                  <p className="text-sm font-semibold text-foreground">{vivaQ}</p>
                </div>

                {/* User Answer Input */}
                <div className="space-y-2">
                  <textarea
                    value={vivaInput}
                    onChange={(e) => setVivaInput(e.target.value)}
                    placeholder="Speak or type your answer to the examiner..."
                    rows={3}
                    className="w-full text-xs p-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button onClick={onSubmitVivaAnswer} loading={vivaLoading} disabled={!vivaInput.trim()} className="w-full">
                    Submit Answer to Examiner
                  </Button>
                </div>

                {/* History & Evaluation */}
                {vivaHistory.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-border">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Viva Session Record
                    </h4>
                    {vivaHistory.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-border bg-card space-y-2 text-xs">
                        <p className="font-semibold text-purple-600 dark:text-purple-400">
                          Q: {item.q}
                        </p>
                        <p className="text-muted-foreground italic">Your Answer: "{item.a}"</p>
                        {item.feedback && (
                          <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                            <strong>Examiner Feedback:</strong> {item.feedback}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 7. Revision Sheet */}
        {mode === "revision" && (
          <RevisionSheet
            revision={revision}
            loading={revisionLoading}
            onGenerate={onRevision}
            onSendToChat={onSendToChat}
          />
        )}
      </div>
    </div>
  );
}
