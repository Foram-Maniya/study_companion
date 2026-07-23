import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Search,
  Trash2,
  Edit2,
  X,
  Clock,
  Check,
  Sparkles,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { ChatMsg } from "@/types/workspace";

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMsg[];
  onSelectQuestion: (messageId: string) => void;
  onDeleteQuestion?: (messageId: string) => void;
  onRenameQuestion?: (messageId: string, newLabel: string) => void;
}

export default function ChatHistorySidebar({
  isOpen,
  onClose,
  messages,
  onSelectQuestion,
  onDeleteQuestion,
  onRenameQuestion,
}: ChatHistorySidebarProps) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const userMessages = messages.filter((m) => m.role === "user");

  const filtered = userMessages.filter((m) =>
    (m.label || m.content).toLowerCase().includes(search.toLowerCase())
  );

  const startEditing = (m: ChatMsg) => {
    setEditingId(m.id);
    setEditValue(m.label || m.content);
  };

  const saveEditing = (mId: string) => {
    if (editValue.trim() && onRenameQuestion) {
      onRenameQuestion(mId, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 250 }}
          className="absolute inset-y-0 right-0 z-30 w-72 bg-card border-l border-border shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span>Chat History</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                {userMessages.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search history..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="text-center py-10 px-4 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">No history found</p>
                <p className="text-[11px] mt-0.5 opacity-70">
                  Ask a question to see history items here
                </p>
              </div>
            ) : (
              filtered.map((msg) => (
                <div
                  key={msg.id}
                  className="group relative flex items-start justify-between p-2.5 rounded-lg hover:bg-secondary/70 transition-all border border-transparent hover:border-border/60 cursor-pointer"
                  onClick={() => onSelectQuestion(msg.id)}
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1 pr-2">
                    <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      {editingId === msg.id ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveEditing(msg.id)}
                            autoFocus
                            className="text-xs px-1.5 py-0.5 rounded border border-primary bg-background w-full"
                          />
                          <button
                            onClick={() => saveEditing(msg.id)}
                            className="p-1 text-success hover:bg-success/10 rounded"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-medium truncate text-foreground">
                            {msg.label || msg.content}
                          </p>
                          {msg.created_at && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatRelativeTime(msg.created_at)}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action overlay buttons */}
                  {editingId !== msg.id && (
                    <div
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0 bg-secondary/80 rounded px-1 py-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onRenameQuestion && (
                        <button
                          onClick={() => startEditing(msg)}
                          title="Rename"
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                      {onDeleteQuestion && (
                        <button
                          onClick={() => onDeleteQuestion(msg.id)}
                          title="Delete"
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
