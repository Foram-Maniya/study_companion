import React, { useRef, useState } from "react";
import { Upload, FileText, CheckCircle2, X, Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface PyqFileItem {
  id: string;
  file: File;
  name: string;
  content: string;
  extracting: boolean;
  extracted: boolean;
}

interface PYQUploadZoneProps {
  files: PyqFileItem[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onAnalyzeAll: () => void;
  analyzing: boolean;
}

export default function PYQUploadZone({
  files,
  onAddFiles,
  onRemoveFile,
  onAnalyzeAll,
  analyzing,
}: PYQUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const isAnyExtracting = files.some((f) => f.extracting);
  const canAnalyze = files.length > 0 && !isAnyExtracting && !analyzing;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) {
      const pdfs = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === "application/pdf"
      );
      if (pdfs.length) onAddFiles(pdfs);
    }
  };

  return (
    <div className="p-3 border-b border-border bg-card/60 space-y-2.5">
      {/* Upload Strip */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-xl border-2 border-dashed p-3 transition-all flex flex-col sm:flex-row items-center justify-between gap-3",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40"
        )}
      >
        <div className="flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">
              Upload PYQ Question Papers (2021–2025)
            </p>
            <p className="text-[11px] text-muted-foreground">
              Drag & drop multiple PDFs or click to add papers for merged pattern analysis
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              const pdfs = Array.from(e.target.files).filter(
                (f) => f.type === "application/pdf"
              );
              if (pdfs.length) onAddFiles(pdfs);
            }
          }}
        />

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5" /> Add Paper
          </Button>

          <Button
            size="sm"
            variant="gradient"
            onClick={onAnalyzeAll}
            disabled={!canAnalyze}
            loading={analyzing}
            className="text-xs h-8"
          >
            <Sparkles className="w-3.5 h-3.5" /> Analyze ({files.length})
          </Button>
        </div>
      </div>

      {/* Uploaded File Chips */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {files.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                item.extracted
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : item.extracting
                  ? "bg-primary/10 border-primary/30 text-primary animate-pulse"
                  : "bg-secondary border-border text-foreground"
              )}
            >
              {item.extracting ? (
                <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
              ) : item.extracted ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              ) : (
                <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
              <span className="truncate max-w-[140px]">{item.name}</span>
              <button
                onClick={() => onRemoveFile(item.id)}
                className="hover:text-destructive p-0.5 rounded text-muted-foreground transition-colors"
                title="Remove paper"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
