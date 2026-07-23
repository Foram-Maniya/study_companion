import React, { useState } from "react";
import { Library, FileText, Calendar, RefreshCw, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

export interface PyqLibraryRecord {
  id: string;
  file_name: string;
  questions_count: number;
  created_at: string;
}

interface PYQLibraryProps {
  records: PyqLibraryRecord[];
  onReanalyze: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function PYQLibrary({
  records,
  onReanalyze,
  onDelete,
}: PYQLibraryProps) {
  const [collapsed, setCollapsed] = useState(true);

  if (!records || records.length === 0) return null;

  return (
    <div className="mx-3 my-2 rounded-xl border border-border bg-muted/20 text-xs overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-2.5 font-semibold text-foreground hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <Library className="w-3.5 h-3.5 text-accent" />
          <span>Uploaded PYQ Papers Library ({records.length})</span>
        </div>
        {collapsed ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {!collapsed && (
        <div className="p-2 space-y-1.5 border-t border-border bg-card">
          {records.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-2 rounded-lg border border-border bg-background hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{r.file_name}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {formatDate(r.created_at)} · {r.questions_count} Questions Extracted
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => onReanalyze(r.id)}
                  title="Re-analyze paper"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                  onClick={() => onDelete(r.id)}
                  title="Delete paper"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
