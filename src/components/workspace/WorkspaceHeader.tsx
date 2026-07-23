import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  FileStack,
  Clock,
  LayoutPanelLeft,
  Columns2,
  PanelRight,
  ChevronRight,
} from "lucide-react";
import { ProgressBar } from "@/components/ui";
import { cn, formatReadingTime } from "@/lib/utils";
import type { PdfData, LayoutMode } from "@/types/workspace";

interface WorkspaceHeaderProps {
  pdf: PdfData;
  layoutMode: LayoutMode;
  onLayoutChange: (mode: LayoutMode) => void;
  onBack: () => void;
}

const LAYOUT_BUTTONS: { mode: LayoutMode; icon: typeof Columns2; label: string }[] = [
  { mode: "split",     icon: Columns2,         label: "Split View" },
  { mode: "assistant", icon: LayoutPanelLeft,  label: "Study Assistant" },
  { mode: "pyq",       icon: PanelRight,       label: "PYQ Analyzer" },
];

export default function WorkspaceHeader({
  pdf,
  layoutMode,
  onLayoutChange,
  onBack,
}: WorkspaceHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
      {/* Left — back + PDF info */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          aria-label="Back to library"
          className="shrink-0 p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="w-9 h-11 rounded-lg gradient-bg flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-white" />
        </div>

        <div className="min-w-0">
          <h1 className="text-base font-semibold truncate max-w-xs sm:max-w-sm">
            {pdf.name}
          </h1>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileStack className="w-3 h-3" />
              {pdf.page_count} pages
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatReadingTime(pdf.reading_time)}
            </span>
            {pdf.topics?.length > 0 && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <ChevronRight className="w-3 h-3" />
                {pdf.topics.slice(0, 2).join(", ")}
                {pdf.topics.length > 2 && ` +${pdf.topics.length - 2}`}
              </span>
            )}
            <div className="w-20 hidden sm:block">
              <ProgressBar value={pdf.progress} />
            </div>
          </div>
        </div>
      </div>

      {/* Right — layout toggle */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/60 p-1">
        {LAYOUT_BUTTONS.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => onLayoutChange(mode)}
            title={label}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              layoutMode === mode
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {layoutMode === mode && (
              <motion.div
                layoutId="layout-pill"
                className="absolute inset-0 rounded-lg gradient-bg"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <Icon className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10 hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
