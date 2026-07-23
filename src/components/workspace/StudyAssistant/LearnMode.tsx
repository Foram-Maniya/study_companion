import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Send,
  BookOpen,
  FileText,
  Target,
  Zap,
  Globe,
  CheckCircle2,
  Copy,
  RefreshCw,
  History,
  HelpCircle,
  BarChart3,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui";
import { renderMarkdown } from "@/lib/markdownRenderer";
import ChatHistorySidebar from "./ChatHistorySidebar";
import { cn } from "@/lib/utils";
import type { ChatMsg, PyqInsight } from "@/types/workspace";

interface LearnModeProps {
  messages: ChatMsg[];
  input: string;
  setInput: (v: string) => void;
  onSend: (prompt?: string) => void;
  loading: boolean;
  loadingMsg: string;
  chatEndRef: React.RefObject<HTMLDivElement>;
  onRegenerate: () => void;
  onCopy: (text: string) => void;
  onSelectQuestionId?: (id: string) => void;
  onDeleteQuestion?: (id: string) => void;
  onRenameQuestion?: (id: string, label: string) => void;
  pyqInsight?: PyqInsight | null;
  onClearInsight?: () => void;
}

export default function LearnMode({
  messages,
  input,
  setInput,
  onSend,
  loading,
  loadingMsg,
  chatEndRef,
  onRegenerate,
  onCopy,
  onSelectQuestionId,
  onDeleteQuestion,
  onRenameQuestion,
  pyqInsight,
  onClearInsight,
}: LearnModeProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const suggestionCategories = [
    {
      category: "Understand",
      items: [
        { icon: BookOpen, label: "Explain this topic", prompt: "Explain the main topic of this material in simple, clear language with examples." },
        { icon: FileText, label: "Explain line by line", prompt: "Give a detailed line-by-line explanation of the main concepts." },
        { icon: Layers, label: "Real-world examples", prompt: "Explain the concepts in this material using real-world applications and practical examples." },
      ],
    },
    {
      category: "Visualize & Format",
      items: [
        { icon: BarChart3, label: "Create comparison table", prompt: "Create a detailed comparison table of the key algorithms/concepts in this material." },
        { icon: Sparkles, label: "Explain with diagrams", prompt: "Explain the workflow of this topic with a Mermaid diagram or flowchart." },
      ],
    },
    {
      category: "Exam & PYQ",
      items: [
        { icon: Target, label: "Important exam topics", prompt: "What are the most important topics and expected questions from this document for university exams?" },
        { icon: Zap, label: "5-min summary", prompt: "Give me a quick 5-minute summary of all chapters." },
      ],
    },
  ];

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* Top Bar for History Toggle & Insights */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          <span>Learn Mode — AI Tutor</span>
        </div>

        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors"
        >
          <History className="w-3.5 h-3.5 text-primary" />
          <span>History</span>
          <span className="text-[10px] px-1.5 rounded-full bg-primary/10 text-primary">
            {messages.filter((m) => m.role === "user").length}
          </span>
        </button>
      </div>

      {/* Synchronized Insight Banner from PYQ Analyzer */}
      {pyqInsight && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-3 mt-2 p-3 rounded-xl border border-primary/30 bg-primary/10 flex items-center justify-between gap-2 text-xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-primary shrink-0 animate-pulse" />
            <div className="min-w-0">
              <span className="font-bold text-foreground truncate block">
                PYQ Insight: "{pyqInsight.topic}"
              </span>
              <span className="text-muted-foreground text-[11px]">
                Asked {pyqInsight.frequency}× · Avg {pyqInsight.avgMarks} Marks · [{pyqInsight.years.join(", ")}]
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              className="h-7 text-[11px] px-2.5"
              onClick={() => onSend(`Explain topic "${pyqInsight.topic}" for a ${pyqInsight.avgMarks}-mark university exam answer.`)}
            >
              Explain Now
            </Button>
            {onClearInsight && (
              <button
                onClick={onClearInsight}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                ✕
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center py-6 max-w-xl mx-auto">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mb-4 shadow-lg"
            >
              <Sparkles className="w-7 h-7 text-white" />
            </motion.div>
            <h3 className="text-base font-bold">Welcome to Study Assistant</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Ask anything about your uploaded study material. Responses are formatted with headings, bullet points, tables & diagrams for easy learning.
            </p>

            {/* Categorized Suggestion Chips */}
            <div className="mt-6 w-full space-y-4 text-left">
              {suggestionCategories.map((cat, i) => (
                <div key={i} className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                    {cat.category}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.items.map((s, j) => (
                      <button
                        key={j}
                        disabled={loading}
                        onClick={() => onSend(s.prompt)}
                        className="flex items-center gap-2 text-left text-xs px-3 py-2.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/60 transition-all disabled:opacity-50 group"
                      >
                        <s.icon className="w-3.5 h-3.5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="truncate font-medium">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div
              key={msg.id}
              id={`msg-${msg.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex gap-3 group", msg.role === "user" ? "justify-end" : "")}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}

              <div className={cn("max-w-[85%]", msg.role === "user" && "flex flex-col items-end")}>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm shadow-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : msg.error
                      ? "bg-destructive/10 text-destructive rounded-bl-sm border border-destructive/20"
                      : "bg-card border border-border rounded-bl-sm"
                  )}
                >
                  {msg.role === "assistant" && !msg.error ? (
                    <div className="space-y-1">{renderMarkdown(msg.content)}</div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>

                {/* Footer metadata & actions for assistant message */}
                {msg.role === "assistant" && !msg.error && (
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    {msg.sourceType === "document" ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <FileText className="w-3 h-3" /> Study Material
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-accent">
                        <Globe className="w-3 h-3" /> AI Knowledge
                      </span>
                    )}

                    {msg.confidence && (
                      <Badge className="px-1.5 py-0 text-[10px] bg-secondary text-muted-foreground">
                        {Math.round(msg.confidence * 100)}% match
                      </Badge>
                    )}

                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                      <button
                        onClick={() => onCopy(msg.content)}
                        title="Copy answer"
                        className="hover:text-foreground p-0.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={onRegenerate}
                        title="Regenerate answer"
                        className="hover:text-foreground p-0.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                  You
                </div>
              )}
            </motion.div>
          ))
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center shrink-0 shadow-sm mt-1">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-xs text-muted-foreground animate-pulse">{loadingMsg}</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask AI Tutor a question about your study material..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-h-32"
          />
          <Button size="icon" onClick={() => onSend()} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Collapsible Chat History Sidebar Drawer */}
      <ChatHistorySidebar
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        messages={messages}
        onSelectQuestion={(id) => {
          setHistoryOpen(false);
          if (onSelectQuestionId) onSelectQuestionId(id);
        }}
        onDeleteQuestion={onDeleteQuestion}
        onRenameQuestion={onRenameQuestion}
      />
    </div>
  );
}
