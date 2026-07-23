// ============================================================
// Shared workspace types — used by StudyWorkspace, StudyAssistant,
// PYQAnalyzer and all sub-components.
// ============================================================

export interface PdfData {
  id: string;
  name: string;
  page_count: number;
  reading_time: number;
  topics: string[];
  content: string;
  progress: number;
  created_at: string;
}

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { page: number; text: string }[];
  confidence?: number;
  sourceType?: "document" | "general";
  loading?: boolean;
  error?: boolean;
  created_at?: string;
  /** Human-readable label used for the history sidebar */
  label?: string;
}

// ---- PYQ types ----

export interface PyqQuestion {
  unit: string;
  topic: string;
  question: string;
  year: string;
  marks: number;
  difficulty: "Easy" | "Medium" | "Hard";
}

export interface PyqFrequencyItem {
  topic: string;
  count: number;
  years?: string[];
  avgMarks?: number;
  priority?: "Very High" | "High" | "Medium" | "Low";
  confidence?: number;
}

export interface PyqTrendItem {
  year: string;
  topics: string[];
}

export interface PyqDuplicate {
  question: string;
  count: number;
  occurrences?: { year: string; marks: number }[];
}

/** Lightweight snapshot surfaced to the Study Assistant insight banner */
export interface PyqInsight {
  topic: string;
  question: string;
  frequency: number;
  avgMarks: number;
  years: string[];
}

/** The right-panel view state */
export type RightView = "overview" | "pyq_upload" | "pyq_results";

/** Layout split mode */
export type LayoutMode = "split" | "assistant" | "pyq";

/** Study Assistant left tab */
export type LeftTab = "learn" | "prepare";

/** Prepare sub-mode */
export type PrepareSubMode =
  | "doubt"
  | "mcq"
  | "short"
  | "long"
  | "flashcard"
  | "viva"
  | "revision";

export type QuizType = "mcq" | "true_false" | "short_answer";

// ---- Revision sheet ----

export interface RevisionData {
  chapterName?: string;
  definitions?: { term: string; definition: string }[];
  keyFormulas?: string[];
  flowchart?: string; // mermaid diagram string
  comparisonTable?: { headers: string[]; rows: string[][] };
  examTips?: string[];
  faqs?: { q: string; a: string }[];
  memoryTricks?: string[];
  keywords?: string[];
  expectedQuestions?: string[];
  vivaQuestions?: string[];
  pyqConnections?: { year: string; question: string; marks: number }[];
  // Legacy fallback fields from old ai-revision response
  notes?: string;
  importantDates?: string[];
}

// ---- Flash cards ----

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}
