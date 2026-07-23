import React, { useState } from "react";
import {
  FileText,
  BarChart3,
  TrendingUp,
  Layers,
  Target,
  Sparkles,
  Repeat,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import PYQUploadZone, { PyqFileItem } from "./PYQUploadZone";
import PYQLibrary, { PyqLibraryRecord } from "./PYQLibrary";
import QuestionsTab from "./tabs/QuestionsTab";
import FrequencyTab from "./tabs/FrequencyTab";
import TrendsTab from "./tabs/TrendsTab";
import UnitAnalysisTab from "./tabs/UnitAnalysisTab";
import ImportantTopicsTab from "./tabs/ImportantTopicsTab";
import ExamStrategyTab from "./tabs/ExamStrategyTab";
import DuplicatesTab from "./tabs/DuplicatesTab";
import { cn } from "@/lib/utils";
import type { PyqInsight } from "@/types/workspace";

export type PyqTab =
  | "questions"
  | "frequency"
  | "trends"
  | "unit"
  | "important"
  | "strategy"
  | "duplicates";

interface PYQAnalyzerProps {
  files: PyqFileItem[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onAnalyzeAll: () => void;
  analyzing: boolean;
  libraryRecords: PyqLibraryRecord[];
  onReanalyzeLibrary: (id: string) => void;
  onDeleteLibrary: (id: string) => void;
  // Results
  questions: any[];
  frequency: any[];
  trends: any[];
  important: any[];
  duplicates: any[];
  answers: Record<string, string>;
  answerLoading: string | null;
  onGenerateAnswer: (question: string, marks?: number) => Promise<string>;
  onSendToAssistant: (insight: PyqInsight) => void;
}

export default function PYQAnalyzer({
  files,
  onAddFiles,
  onRemoveFile,
  onAnalyzeAll,
  analyzing,
  libraryRecords,
  onReanalyzeLibrary,
  onDeleteLibrary,
  questions,
  frequency,
  trends,
  important,
  duplicates,
  answers,
  answerLoading,
  onGenerateAnswer,
  onSendToAssistant,
}: PYQAnalyzerProps) {
  const [activeTab, setActiveTab] = useState<PyqTab>("questions");
  const toast = useToast();

  const tabs: { id: PyqTab; label: string; icon: any }[] = [
    { id: "questions", label: "Questions", icon: FileText },
    { id: "frequency", label: "Frequency", icon: BarChart3 },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "unit", label: "Unit Analysis", icon: Layers },
    { id: "important", label: "Important", icon: Target },
    { id: "strategy", label: "Exam Strategy", icon: Sparkles },
    { id: "duplicates", label: "Duplicates", icon: Repeat },
  ];

  const handleExportMarkdown = () => {
    const lines = [
      `# PYQ Analysis Report`,
      `Date: ${new Date().toLocaleDateString()}`,
      `Uploaded Papers: ${files.map((f) => f.name).join(", ") || "PYQ Set"}`,
      `\n## Questions Extracted`,
      ...questions.map((q, i) => `${i + 1}. ${typeof q === "string" ? q : q.question}`),
      `\n## Important Topics`,
      ...important.map((t, i) => `- ${typeof t === "string" ? t : t.name}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PYQ-Analysis-Report.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported Markdown Report");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 1. Top-Mounted Compact Multi-PDF Upload Strip */}
      <PYQUploadZone
        files={files}
        onAddFiles={onAddFiles}
        onRemoveFile={onRemoveFile}
        onAnalyzeAll={onAnalyzeAll}
        analyzing={analyzing}
      />

      {/* 2. Persistent Uploaded PYQ Library */}
      <PYQLibrary
        records={libraryRecords}
        onReanalyze={onReanalyzeLibrary}
        onDelete={onDeleteLibrary}
      />

      {/* 3. Horizontal 7-Tab Navigation & Export */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors",
                activeTab === t.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleExportMarkdown}
          className="h-7 text-xs px-2 shrink-0"
          title="Export report as Markdown"
        >
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      </div>

      {/* 4. Tab Body Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {analyzing ? (
          <div className="p-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-xs font-semibold text-foreground animate-pulse">
              Merging & Analyzing Uploaded Question Papers...
            </p>
          </div>
        ) : (
          <>
            {activeTab === "questions" && (
              <QuestionsTab
                questions={questions}
                answers={answers}
                answerLoading={answerLoading}
                onGenerateAnswer={onGenerateAnswer}
                onSendToAssistant={onSendToAssistant}
              />
            )}

            {activeTab === "frequency" && <FrequencyTab frequency={frequency} />}

            {activeTab === "trends" && <TrendsTab trends={trends} />}

            {activeTab === "unit" && <UnitAnalysisTab questions={questions} />}

            {activeTab === "important" && <ImportantTopicsTab important={important} />}

            {activeTab === "strategy" && (
              <ExamStrategyTab questions={questions} frequency={frequency} />
            )}

            {activeTab === "duplicates" && <DuplicatesTab duplicates={duplicates} />}
          </>
        )}
      </div>
    </div>
  );
}
