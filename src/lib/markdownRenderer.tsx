/**
 * Enhanced Markdown Renderer
 *
 * Supports:
 *  - # ## ### #### headings
 *  - **bold**, *italic*, `code`, ~~strikethrough~~
 *  - Bullet lists (nested) and ordered lists
 *  - Proper <table> rendering
 *  - Code blocks with language label
 *  - Mermaid diagram blocks (rendered as styled pre)
 *  - Blockquotes with variants: key-point, exam-tip, note, warning
 *  - Definition pills: **Term**: explanation
 *  - Horizontal rules
 */

import React from "react";
import { cn } from "@/lib/utils";

// ─── Inline formatting ────────────────────────────────────────────────────────

function formatInline(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /`(.+?)`/g,
      '<code class="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">$1</code>'
    )
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(
      /==(.+?)==/g,
      '<mark class="bg-warning/20 text-warning-foreground px-0.5 rounded">$1</mark>'
    );
}

// ─── Token types ──────────────────────────────────────────────────────────────

type BQVariant = "key" | "tip" | "note" | "warning" | "default";

type Token =
  | { t: "h1" | "h2" | "h3" | "h4"; text: string }
  | { t: "hr" }
  | { t: "blank" }
  | { t: "paragraph"; text: string }
  | { t: "bullet"; text: string; depth: number }
  | { t: "ordered"; text: string; idx: number }
  | { t: "code"; lang: string; body: string }
  | { t: "mermaid"; body: string }
  | { t: "table"; rows: string[][]; headerRow: number }
  | { t: "blockquote"; text: string; variant: BQVariant }
  | { t: "definition"; term: string; def: string };

// ─── Tokenizer ────────────────────────────────────────────────────────────────

function tokenize(src: string): Token[] {
  const lines = src.split("\n");
  const tokens: Token[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const tr = line.trim();

    // ── Code / Mermaid block ──────────────────────────────────────────────
    if (tr.startsWith("```")) {
      const lang = tr.slice(3).trim().toLowerCase();
      let body = "";
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        body += lines[i] + "\n";
        i++;
      }
      i++; // skip closing ```
      if (lang === "mermaid") {
        tokens.push({ t: "mermaid", body: body.trimEnd() });
      } else {
        tokens.push({ t: "code", lang, body: body.trimEnd() });
      }
      continue;
    }

    // ── Headings ─────────────────────────────────────────────────────────
    if (tr.startsWith("#### ")) { tokens.push({ t: "h4", text: tr.slice(5) }); i++; continue; }
    if (tr.startsWith("### "))  { tokens.push({ t: "h3", text: tr.slice(4) }); i++; continue; }
    if (tr.startsWith("## "))   { tokens.push({ t: "h2", text: tr.slice(3) }); i++; continue; }
    if (tr.startsWith("# "))    { tokens.push({ t: "h1", text: tr.slice(2) }); i++; continue; }

    // ── Horizontal rule ───────────────────────────────────────────────────
    if (/^[-*_]{3,}$/.test(tr)) { tokens.push({ t: "hr" }); i++; continue; }

    // ── Blockquote ────────────────────────────────────────────────────────
    if (tr.startsWith("> ")) {
      const inner = tr.slice(2);
      let variant: BQVariant = "default";
      if (/^\*\*(Key Point|Key)\*\*[: ]/i.test(inner)) variant = "key";
      else if (/^\*\*(Exam Tip|Tip)\*\*[: ]/i.test(inner)) variant = "tip";
      else if (/^(\[!NOTE\]|\*\*Note\*\*)[: ]/.test(inner)) variant = "note";
      else if (/^(\[!WARNING\]|\*\*Warning\*\*)[: ]/.test(inner)) variant = "warning";
      tokens.push({ t: "blockquote", text: inner, variant });
      i++; continue;
    }

    // ── Table ─────────────────────────────────────────────────────────────
    if (tr.startsWith("|") && tr.endsWith("|")) {
      const tLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tLines.push(lines[i].trim());
        i++;
      }
      const rows: string[][] = [];
      let headerRow = -1;
      tLines.forEach((tl, ri) => {
        if (/^\|[\s:-]+\|/.test(tl)) { headerRow = ri - 1; return; }
        const cells = tl.split("|").slice(1, -1).map((c) => c.trim());
        rows.push(cells);
      });
      if (rows.length > 0) tokens.push({ t: "table", rows, headerRow: Math.max(0, headerRow) });
      continue;
    }

    // ── Bullet list ───────────────────────────────────────────────────────
    const bulletMatch = line.match(/^(\s*)([-*+])\s+(.+)/);
    if (bulletMatch) {
      const depth = Math.floor(bulletMatch[1].length / 2);
      tokens.push({ t: "bullet", text: bulletMatch[3], depth });
      i++; continue;
    }

    // ── Ordered list ──────────────────────────────────────────────────────
    const orderedMatch = tr.match(/^(\d+)\.\s+(.+)/);
    if (orderedMatch) {
      tokens.push({ t: "ordered", text: orderedMatch[2], idx: parseInt(orderedMatch[1]) });
      i++; continue;
    }

    // ── Blank line ────────────────────────────────────────────────────────
    if (!tr) { tokens.push({ t: "blank" }); i++; continue; }

    // ── Definition pill: **Term**: explanation ────────────────────────────
    const defMatch = tr.match(/^\*\*(.+?)\*\*:\s+(.+)/);
    if (defMatch) {
      tokens.push({ t: "definition", term: defMatch[1], def: defMatch[2] });
      i++; continue;
    }

    // ── Paragraph ─────────────────────────────────────────────────────────
    tokens.push({ t: "paragraph", text: tr });
    i++;
  }

  return tokens;
}

// ─── Mermaid block (styled fallback) ─────────────────────────────────────────

function MermaidBlock({ code }: { code: string }) {
  return (
    <div className="my-3 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/10 bg-primary/[0.08]">
        <span className="text-xs font-mono font-semibold text-primary">📊 Diagram</span>
      </div>
      <pre className="p-3 text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

// ─── Main render function ─────────────────────────────────────────────────────

export function renderMarkdown(src: string): React.ReactNode[] {
  if (!src?.trim()) return [];

  const tokens = tokenize(src);
  const nodes: React.ReactNode[] = [];
  let bullets: { text: string; depth: number }[] = [];
  let ordered: { text: string; idx: number }[] = [];

  const flushBullets = (k: string) => {
    if (!bullets.length) return;
    nodes.push(
      <ul key={k} className="my-2 space-y-1.5">
        {bullets.map((b, j) => (
          <li
            key={j}
            className={cn("flex items-start gap-2 text-sm", b.depth > 0 && "ml-5")}
          >
            <span className="text-primary mt-0.5 shrink-0 font-bold">•</span>
            <span dangerouslySetInnerHTML={{ __html: formatInline(b.text) }} />
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  const flushOrdered = (k: string) => {
    if (!ordered.length) return;
    nodes.push(
      <ol key={k} className="my-2 space-y-1.5 list-decimal ml-5">
        {ordered.map((o, j) => (
          <li key={j} className="text-sm pl-1">
            <span dangerouslySetInnerHTML={{ __html: formatInline(o.text) }} />
          </li>
        ))}
      </ol>
    );
    ordered = [];
  };

  tokens.forEach((tok, i) => {
    const k = `md-${i}`;

    if (tok.t !== "bullet") flushBullets(`bl-${k}`);
    if (tok.t !== "ordered") flushOrdered(`ol-${k}`);

    switch (tok.t) {
      case "h1":
        nodes.push(
          <h2 key={k} className="text-base font-bold mt-4 mb-1.5 text-foreground border-b border-border/60 pb-1"
            dangerouslySetInnerHTML={{ __html: formatInline(tok.text) }} />
        );
        break;
      case "h2":
        nodes.push(
          <h3 key={k} className="text-sm font-bold mt-3 mb-1 text-foreground"
            dangerouslySetInnerHTML={{ __html: formatInline(tok.text) }} />
        );
        break;
      case "h3":
        nodes.push(
          <h4 key={k} className="text-sm font-semibold mt-2.5 mb-1 text-foreground"
            dangerouslySetInnerHTML={{ __html: formatInline(tok.text) }} />
        );
        break;
      case "h4":
        nodes.push(
          <h5 key={k} className="text-xs font-semibold mt-2 mb-0.5 text-muted-foreground uppercase tracking-wider"
            dangerouslySetInnerHTML={{ __html: formatInline(tok.text) }} />
        );
        break;
      case "hr":
        nodes.push(<hr key={k} className="my-3 border-border" />);
        break;
      case "blank":
        break; // swallow blanks — spacing handled by margins
      case "bullet":
        bullets.push({ text: tok.text, depth: tok.depth });
        break;
      case "ordered":
        ordered.push({ text: tok.text, idx: tok.idx });
        break;
      case "code":
        nodes.push(
          <div key={k} className="my-2 rounded-lg overflow-hidden border border-border text-xs">
            {tok.lang && (
              <div className="px-3 py-1 bg-muted text-muted-foreground font-mono border-b border-border flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-destructive/60" />
                <span className="w-2 h-2 rounded-full bg-warning/60" />
                <span className="w-2 h-2 rounded-full bg-success/60" />
                <span className="ml-2">{tok.lang}</span>
              </div>
            )}
            <pre className="p-3 bg-muted/40 overflow-x-auto font-mono text-foreground leading-relaxed">
              <code>{tok.body}</code>
            </pre>
          </div>
        );
        break;
      case "mermaid":
        nodes.push(<MermaidBlock key={k} code={tok.body} />);
        break;
      case "table": {
        nodes.push(
          <div key={k} className="my-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs border-collapse">
              <tbody>
                {tok.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className={cn(
                      "border-b border-border last:border-0",
                      ri === tok.headerRow
                        ? "bg-primary/8 font-semibold"
                        : ri % 2 === 0
                        ? "bg-background"
                        : "bg-muted/20"
                    )}
                  >
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={cn(
                          "px-3 py-2 border-r border-border last:border-r-0 align-top",
                          ri === tok.headerRow && "text-foreground font-semibold"
                        )}
                        dangerouslySetInnerHTML={{ __html: formatInline(cell) }}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        break;
      }
      case "blockquote": {
        const cfg: Record<BQVariant, { cls: string; icon: string }> = {
          key:     { cls: "border-blue-500/40 bg-blue-500/8 text-blue-600 dark:text-blue-400",      icon: "💡" },
          tip:     { cls: "border-warning/40 bg-warning/8 text-amber-600 dark:text-amber-400",      icon: "📝" },
          note:    { cls: "border-primary/40 bg-primary/8 text-primary",                            icon: "ℹ️" },
          warning: { cls: "border-destructive/40 bg-destructive/8 text-destructive",                icon: "⚠️" },
          default: { cls: "border-border bg-secondary/60 text-muted-foreground",                    icon: "›" },
        };
        const { cls, icon } = cfg[tok.variant];
        nodes.push(
          <div key={k} className={cn("my-2 flex gap-2 rounded-lg border-l-4 px-3 py-2.5 text-sm", cls)}>
            <span className="shrink-0">{icon}</span>
            <span dangerouslySetInnerHTML={{ __html: formatInline(tok.text) }} />
          </div>
        );
        break;
      }
      case "definition":
        nodes.push(
          <div key={k} className="my-1.5 flex flex-wrap items-baseline gap-2">
            <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {tok.term}
            </span>
            <span className="text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: formatInline(tok.def) }} />
          </div>
        );
        break;
      case "paragraph":
        nodes.push(
          <p key={k} className="text-sm my-1 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatInline(tok.text) }} />
        );
        break;
    }
  });

  // flush any trailing lists
  flushBullets("bl-final");
  flushOrdered("ol-final");

  return nodes;
}
