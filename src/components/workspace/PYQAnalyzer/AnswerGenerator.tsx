import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Award, Copy, Check, X, BookOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { renderMarkdown } from "@/lib/markdownRenderer";
import { cn } from "@/lib/utils";

interface AnswerGeneratorProps {
  question: string;
  defaultMarks?: number;
  onGenerate: (question: string, marks: number) => Promise<string>;
  onSendToAssistant?: (question: string) => void;
  onClose?: () => void;
}

const MARK_SCHEMES = [
  { marks: 2, label: "2 Marks (Very Short)", desc: "Definition + 1 Key Point" },
  { marks: 4, label: "4 Marks (Short)", desc: "Definition + Explanation + Example" },
  { marks: 7, label: "7 Marks (Medium)", desc: "Def + Working + Diagram + Advantages" },
  { marks: 10, label: "10 Marks (Long)", desc: "Full University Answer (Diagram + Adv/Disadv + App)" },
];

export default function AnswerGenerator({
  question,
  defaultMarks = 7,
  onGenerate,
  onSendToAssistant,
  onClose,
}: AnswerGeneratorProps) {
  const [selectedMarks, setSelectedMarks] = useState<number>(defaultMarks);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setAnswer(null);
    try {
      const result = await onGenerate(question, selectedMarks);
      setAnswer(result);
    } catch {
      setAnswer("Failed to generate answer. Please try again.");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (answer) {
      navigator.clipboard.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-primary/30 bg-card shadow-xl space-y-4 text-xs">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm text-foreground">
            Marks-Calibrated Answer Generator
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Target Question */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Selected Question:
        </span>
        <p className="text-xs font-semibold text-foreground mt-0.5">{question}</p>
      </div>

      {/* Mark Scheme Selector */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground">
          Select Exam Mark Scheme:
        </span>
        <div className="grid grid-cols-2 gap-2">
          {MARK_SCHEMES.map((scheme) => (
            <button
              key={scheme.marks}
              onClick={() => setSelectedMarks(scheme.marks)}
              className={cn(
                "p-2.5 rounded-xl border text-left transition-all",
                selectedMarks === scheme.marks
                  ? "bg-primary/10 border-primary text-primary font-semibold"
                  : "border-border hover:bg-secondary/60 text-muted-foreground"
              )}
            >
              <p className="text-xs font-bold">{scheme.label}</p>
              <p className="text-[10px] opacity-80 mt-0.5">{scheme.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Action Button */}
      {!answer && (
        <Button
          onClick={handleGenerate}
          loading={loading}
          variant="gradient"
          className="w-full h-9 text-xs"
        >
          <Sparkles className="w-4 h-4" /> Generate {selectedMarks}-Mark Answer Scheme
        </Button>
      )}

      {/* Answer Output */}
      {answer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 pt-2"
        >
          <div className="flex items-center justify-between text-xs font-bold text-foreground border-b border-border pb-1">
            <span>Generated Answer ({selectedMarks} Marks):</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              {onSendToAssistant && (
                <button
                  onClick={() => onSendToAssistant(question)}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Ask Assistant
                </button>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/20 border border-border space-y-1 max-h-72 overflow-y-auto scrollbar-thin">
            {renderMarkdown(answer)}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            loading={loading}
            className="w-full text-xs"
          >
            Regenerate Answer
          </Button>
        </motion.div>
      )}
    </div>
  );
}
