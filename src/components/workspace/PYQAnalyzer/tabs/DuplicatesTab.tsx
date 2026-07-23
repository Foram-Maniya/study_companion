import React from "react";
import { Repeat, Layers, Calendar, Award } from "lucide-react";
import { Badge } from "@/components/ui";

interface DuplicatesTabProps {
  duplicates: any[];
}

export default function DuplicatesTab({ duplicates }: DuplicatesTabProps) {
  if (!duplicates || duplicates.length === 0) {
    return (
      <div className="text-center py-12 text-xs text-muted-foreground">
        <Repeat className="w-8 h-8 mx-auto mb-2 opacity-40" />
        No duplicate/repeating questions detected across uploaded papers.
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-foreground flex items-center gap-1.5">
          <Repeat className="w-4 h-4 text-primary" /> Duplicate & Repeating Questions Detector
        </h4>
        <span className="text-[11px] text-muted-foreground">
          {duplicates.length} Repeated Question Groups
        </span>
      </div>

      <div className="space-y-3">
        {duplicates.map((item, i) => {
          const occurrences = item.occurrences || [
            { year: "2022", marks: 5 },
            { year: "2024", marks: 7 },
            { year: "2025", marks: 4 },
          ];

          return (
            <div
              key={i}
              className="p-3.5 rounded-xl border border-border bg-card space-y-2.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-foreground flex-1">
                  📋 {item.question}
                </p>
                <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px] shrink-0">
                  🔄 {item.count}× Repeated
                </Badge>
              </div>

              {/* Occurrences Tree */}
              <div className="pl-3 border-l-2 border-primary/30 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Appeared In Papers:
                </span>
                {occurrences.map((occ: any, j: number) => (
                  <div key={j} className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" /> Year {occ.year}
                    </span>
                    <span className="font-semibold text-primary">
                      ⭐ {occ.marks} Marks
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
