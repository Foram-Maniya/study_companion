import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Zap,
  Sparkles,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  Brain,
  MessageSquare,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui";
import { renderMarkdown } from "@/lib/markdownRenderer";
import type { RevisionData } from "@/types/workspace";

interface RevisionSheetProps {
  revision: RevisionData | null;
  loading: boolean;
  onGenerate: () => void;
  onSendToChat?: (question: string) => void;
}

export default function RevisionSheet({
  revision,
  loading,
  onGenerate,
  onSendToChat,
}: RevisionSheetProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <Sparkles className="w-4 h-4 text-warning animate-spin" />
          <span>Generating Quick Revision Sheet...</span>
        </div>
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!revision) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mb-4 text-warning">
          <Zap className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold">5-Minute Quick Revision Sheet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Generate structured notes with formulas, diagrams, exam tips, viva questions, and PYQ connections.
        </p>
        <Button onClick={onGenerate} variant="gradient" className="mt-6">
          <Sparkles className="w-4 h-4" /> Generate Revision Sheet
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-5"
    >
      {/* Header Banner */}
      <div className="rounded-2xl gradient-bg p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
          <Zap className="w-4 h-4 text-amber-300" />
          <span>Quick Revision Sheet</span>
        </div>
        <h2 className="text-xl font-bold mt-1">
          {revision.chapterName || "Key Concepts Overview"}
        </h2>
        <p className="text-xs text-white/80 mt-1">
          Review formulas, definitions, viva questions & exam patterns in 5 minutes.
        </p>
      </div>

      {/* Legacy/Freeform notes block if present */}
      {revision.notes && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Summary Notes
          </h4>
          <div className="text-sm leading-relaxed">
            {renderMarkdown(revision.notes)}
          </div>
        </div>
      )}

      {/* 1. Important Definitions */}
      {revision.definitions && revision.definitions.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Important Definitions
          </h4>
          <div className="grid grid-cols-1 gap-2.5">
            {revision.definitions.map((def, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border border-primary/10 bg-primary/[0.03] space-y-1"
              >
                <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10 inline-block">
                  {def.term}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  {def.definition}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Key Formulas */}
      {revision.keyFormulas && revision.keyFormulas.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Key Formulas & Equations
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {revision.keyFormulas.map((formula, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg border border-border bg-muted/30 font-mono text-xs font-semibold text-foreground flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                <span>{formula}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Flowchart / Mind Map */}
      {revision.flowchart && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" /> Mind Map / Flowchart
          </h4>
          {renderMarkdown(`\`\`\`mermaid\n${revision.flowchart}\n\`\`\``)}
        </div>
      )}

      {/* 4. Comparison Table */}
      {revision.comparisonTable && revision.comparisonTable.headers && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Quick Comparison Table
          </h4>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 font-semibold border-b border-border">
                <tr>
                  {revision.comparisonTable.headers.map((h, i) => (
                    <th key={i} className="p-2.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {revision.comparisonTable.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    {row.map((cell, j) => (
                      <td key={j} className="p-2.5 text-muted-foreground">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Exam Tips */}
      {revision.examTips && revision.examTips.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" /> Pro Exam Tips
          </h4>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {revision.examTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold shrink-0">✓</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. Viva Questions */}
      {revision.vivaQuestions && revision.vivaQuestions.length > 0 && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Expected Viva Questions
          </h4>
          <div className="space-y-2">
            {revision.vivaQuestions.map((q, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg border border-purple-500/20 bg-background/80 flex items-center justify-between text-xs font-medium"
              >
                <span>{q}</span>
                {onSendToChat && (
                  <button
                    onClick={() => onSendToChat(q)}
                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline shrink-0 ml-2"
                  >
                    Ask AI
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. PYQ Connections */}
      {revision.pyqConnections && revision.pyqConnections.length > 0 && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> PYQ History for this Material
          </h4>
          <div className="space-y-2">
            {revision.pyqConnections.map((item, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg border border-emerald-500/20 bg-background/80 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-foreground">
                    [{item.year}] {item.question}
                  </span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                  {item.marks} Marks
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. FAQs Accordion */}
      {revision.faqs && revision.faqs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" /> Frequently Asked Questions
          </h4>
          <div className="space-y-1.5">
            {revision.faqs.map((faq, i) => (
              <div key={i} className="rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-left hover:bg-muted/30 transition-colors"
                >
                  <span>{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="p-2.5 pt-0 text-xs text-muted-foreground border-t border-border/50 bg-muted/10">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
