import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  FileText,
  Send,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  FileQuestion,
  Zap,
  TrendingUp,
  Upload,
  Loader2,
  FileStack,
  Clock,
  Target,
  BarChart3,
  Download,
  Copy,
  ChevronRight,
  RefreshCw,
  Globe,
  AlertCircle,
  Calendar,
  Repeat,
  Layers,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar, Skeleton, Badge } from "@/components/ui";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { aiService } from "@/services/aiService";
import { cn, formatReadingTime, formatDate, arrayBufferToBase64 } from "@/lib/utils";

interface PdfData {
  id: string;
  name: string;
  page_count: number;
  reading_time: number;
  topics: string[];
  content: string;
  progress: number;
  created_at: string;
}

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { page: number; text: string }[];
  confidence?: number;
  sourceType?: "document" | "general";
  loading?: boolean;
  error?: boolean;
}

type LeftTab = "learn" | "prepare";
type PrepareMode = "doubt" | "quiz" | "revision";
type QuizType = "mcq" | "true_false" | "short_answer";
type RightView = "overview" | "pyq" | "pyq_results";
type PyqTab = "questions" | "frequency" | "trends" | "chapters" | "duplicates";

const LOADING_MESSAGES = [
  "Thinking...",
  "Analyzing document...",
  "Generating response...",
  "Searching through your PDF...",
];

export default function StudyWorkspace() {
  const { pdfId } = useParams<{ pdfId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [pdf, setPdf] = useState<PdfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [leftTab, setLeftTab] = useState<LeftTab>("learn");
  const [prepareMode, setPrepareMode] = useState<PrepareMode>("doubt");
  const [rightView, setRightView] = useState<RightView>("overview");

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Prepare state
  const [doubtInput, setDoubtInput] = useState("");
  const [doubtAnswer, setDoubtAnswer] = useState<string | null>(null);
  const [doubtLoading, setDoubtLoading] = useState(false);
  const [quiz, setQuiz] = useState<any[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [revision, setRevision] = useState<any>(null);
  const [revisionLoading, setRevisionLoading] = useState(false);

  // PYQ state
  const [pyqQuestions, setPyqQuestions] = useState<string[]>([]);
  const [pyqFrequency, setPyqFrequency] = useState<{ topic: string; count: number }[]>([]);
  const [pyqTrends, setPyqTrends] = useState<{ year: string; topics: string[] }[]>([]);
  const [pyqImportant, setPyqImportant] = useState<string[]>([]);
  const [pyqDuplicates, setPyqDuplicates] = useState<{ question: string; count: number }[]>([]);
  const [pyqLoading, setPyqLoading] = useState(false);
  const [pyqAnswers, setPyqAnswers] = useState<Record<string, string>>({});
  const [pyqAnswerLoading, setPyqAnswerLoading] = useState<string | null>(null);
  const [pyqFile, setPyqFile] = useState<File | null>(null);
  const [pyqFileName, setPyqFileName] = useState<string>("");

  // Cross-panel
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  useEffect(() => {
    if (pdfId) loadPdf(pdfId);
  }, [pdfId]);

  useEffect(() => {
    if (pdfId) loadChats(pdfId);
  }, [pdfId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cycle loading messages
  useEffect(() => {
    if (chatLoading) {
      const interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [chatLoading]);

  // Handle pending question from PYQ
  useEffect(() => {
    if (pendingQuestion) {
      setLeftTab("learn");
      setPendingQuestion(null);
      handleSend(pendingQuestion);
    }
  }, [pendingQuestion]);

  async function loadPdf(id: string) {
    const { data } = await supabase.from("pdfs").select("*").eq("id", id).maybeSingle();
    if (data) {
      setPdf(data);
      if (data.progress === 0) {
        setRightView("overview");
      }
    }
    setLoading(false);
  }

  async function loadChats(id: string) {
    const { data } = await supabase
      .from("chats")
      .select("*")
      .eq("pdf_id", id)
      .order("created_at", { ascending: true });
    if (data && data.length > 0) {
      setMessages(
        data.map((c) => ({
          id: c.id,
          role: c.role as "user" | "assistant",
          content: c.content,
          sources: c.sources?.sources || [],
          confidence: c.sources?.confidence,
          sourceType: c.sources?.sourceType || "document",
        }))
      );
    }
  }

  const handleSend = useCallback(
    async (question?: string) => {
      const q = question || input.trim();
      if (!q || !pdf || chatLoading) return;

      const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: q };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setChatLoading(true);
      setLoadingMsgIndex(0);

      await supabase.from("chats").insert({
        pdf_id: pdf.id,
        role: "user",
        content: q,
        mode: "learn",
      });

      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      try {
        const res = await aiService.askQuestion(pdf.id, q, history, pdf.content || pdf.name);

        const aiMsg: ChatMsg = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.answer,
          sources: res.sources,
          confidence: res.confidence,
          sourceType: res.sources && res.sources.length > 0 ? "document" : "general",
        };
        setMessages((prev) => [...prev, aiMsg]);

        await supabase.from("chats").insert({
          pdf_id: pdf.id,
          role: "assistant",
          content: res.answer,
          sources: { sources: res.sources, confidence: res.confidence, sourceType: aiMsg.sourceType },
          mode: "learn",
        });

        // Update progress
        if (pdf.progress < 100) {
          const newProgress = Math.min(100, pdf.progress + 5);
          setPdf({ ...pdf, progress: newProgress });
          await supabase.from("pdfs").update({ progress: newProgress }).eq("id", pdf.id);
        }
      } catch {
        const errMsg: ChatMsg = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Unable to reach AI. Please try again.",
          error: true,
        };
        setMessages((prev) => [...prev, errMsg]);
      }

      setChatLoading(false);
    },
    [pdf, chatLoading, input, messages]
  );

  async function handleRegenerate() {
    // Find last user message
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    // Remove last assistant message
    setMessages((prev) => {
      const copy = [...prev];
      if (copy[copy.length - 1]?.role === "assistant") copy.pop();
      return copy;
    });
    handleSend(lastUser.content);
  }

  async function handleDoubt() {
    if (!doubtInput.trim() || !pdf) return;
    setDoubtLoading(true);
    setDoubtAnswer(null);
    try {
      const res = await aiService.askQuestion(pdf.id, doubtInput, [], pdf.content || pdf.name);
      setDoubtAnswer(res.answer);
    } catch {
      setDoubtAnswer("Unable to reach AI. Please try again.");
    }
    setDoubtLoading(false);
  }

  async function handleGenerateQuiz(type: QuizType) {
    if (!pdf) return;
    setQuizLoading(true);
    setQuiz([]);
    setQuizAnswers({});
    setQuizSubmitted(false);
    try {
      const res = await aiService.generateQuiz(pdf.id, type, pdf.content || pdf.name);
      setQuiz(res.questions || []);
    } catch {
      toast.error("Failed to generate quiz", "Please try again");
    }
    setQuizLoading(false);
  }

  async function handleRevision() {
    if (!pdf) return;
    setRevisionLoading(true);
    setRevision(null);
    try {
      const res = await aiService.generateRevision(pdf.id, pdf.content || pdf.name);
      setRevision(res);
      await supabase.from("summaries").insert({
        pdf_id: pdf.id,
        content: res.notes,
        type: "revision",
      });
    } catch {
      toast.error("Failed to generate revision", "Please try again");
    }
    setRevisionLoading(false);
  }

  const [pyqContent, setPyqContent] = useState<string>("");
  const [pyqExtracting, setPyqExtracting] = useState(false);

  async function handlePyqUpload(file: File) {
    setPyqFile(file);
    setPyqFileName(file.name);
    setPyqExtracting(true);
    setPyqContent("");

    // Extract text from PYQ PDF using the process-pdf edge function
    try {
      const fileArrayBuffer = await file.arrayBuffer();
      const fileBase64 = arrayBufferToBase64(fileArrayBuffer);

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const processRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            pdfId: null,
            fileContent: fileBase64,
          }),
        }
      );

      if (processRes.ok) {
        const processData = await processRes.json();
        setPyqContent(processData.text || "");
        toast.success("PYQ text extracted", "Ready to analyze");
      } else {
        toast.error("Failed to extract PYQ text", "Will use study material instead");
      }
    } catch {
      toast.error("Failed to extract PYQ text", "Will use study material instead");
    }
    setPyqExtracting(false);
  }

  async function handleAnalyzePyq() {
    if (!pdf) return;
    setPyqLoading(true);
    setRightView("pyq_results");
    try {
      const res = await aiService.analyzePyq(pdf.id, pyqContent || pdf.content || "", pdf.content || pdf.name);
      setPyqQuestions(res.questions || []);
      setPyqFrequency(res.frequency || []);
      setPyqTrends(res.trends || []);
      setPyqImportant(res.importantChapters || []);
      setPyqDuplicates(res.duplicates || []);

      await supabase.from("pyq_analyses").insert({
        pdf_id: pdf.id,
        pyq_file_path: pyqFileName || null,
        questions: res.questions,
        frequency: res.frequency,
        trends: res.trends,
        important_chapters: res.importantChapters,
      });
    } catch {
      toast.error("PYQ analysis failed", "Please try again");
    }
    setPyqLoading(false);
  }

  async function handleGenerateAnswer(question: string) {
    if (!pdf) return;
    setPyqAnswerLoading(question);
    try {
      const answer = await aiService.generateAnswer(question, pdf.content || pdf.name);
      setPyqAnswers((prev) => ({ ...prev, [question]: answer }));
    } catch {
      setPyqAnswers((prev) => ({ ...prev, [question]: "Unable to reach AI. Please try again." }));
    }
    setPyqAnswerLoading(null);
  }

  function handleSendToAssistant(question: string) {
    setPendingQuestion(question);
    toast.info("Sent to Study Assistant", "Check the left panel");
  }

  function exportReport() {
    const report = {
      pdf: pdf?.name,
      date: new Date().toISOString(),
      questions: pyqQuestions,
      frequency: pyqFrequency,
      trends: pyqTrends,
      importantChapters: pyqImportant,
      duplicates: pyqDuplicates,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pdf?.name || "pyq"}-analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!pdf) {
    return (
      <div className="text-center py-20">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-semibold">PDF not found</p>
        <Button onClick={() => navigate("/library")} className="mt-4">
          Back to Library
        </Button>
      </div>
    );
  }

  const suggestionChips = [
    { icon: BookOpen, label: "Explain this document", prompt: "Explain the main concepts in this document in simple language" },
    { icon: FileText, label: "Give me a summary", prompt: "Give me a comprehensive chapter summary of this document" },
    { icon: Target, label: "Important topics", prompt: "What are the key topics I should focus on for my exam?" },
    { icon: Sparkles, label: "Explain with examples", prompt: "Explain the key concepts with real-life examples" },
    { icon: Brain, label: "Quiz me", prompt: "Quiz me on the important concepts from this document" },
    { icon: Zap, label: "Last minute revision", prompt: "Give me last minute revision notes for this document" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/library")}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-12 rounded-lg gradient-bg flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold truncate max-w-xs sm:max-w-md">{pdf.name}</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {pdf.page_count} pages · {formatReadingTime(pdf.reading_time)} · {pdf.progress}% complete
              </p>
              <div className="w-20">
                <ProgressBar value={pdf.progress} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[calc(100vh-12rem)]">
        {/* LEFT PANEL: Study Assistant */}
        <Card className="flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center border-b border-border">
            <button
              onClick={() => setLeftTab("learn")}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors relative",
                leftTab === "learn" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BookOpen className="w-4 h-4" /> Learn
              {leftTab === "learn" && (
                <motion.div layoutId="left-tab" className="absolute bottom-0 left-0 right-0 h-0.5 gradient-bg" />
              )}
            </button>
            <button
              onClick={() => setLeftTab("prepare")}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors relative",
                leftTab === "prepare" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <GraduationCap className="w-4 h-4" /> Prepare
              {leftTab === "prepare" && (
                <motion.div layoutId="left-tab" className="absolute bottom-0 left-0 right-0 h-0.5 gradient-bg" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {leftTab === "learn" ? (
              <LearnPanel
                messages={messages}
                input={input}
                setInput={setInput}
                onSend={() => handleSend()}
                loading={chatLoading}
                loadingMsg={LOADING_MESSAGES[loadingMsgIndex]}
                suggestionChips={suggestionChips}
                onSuggestion={(prompt) => handleSend(prompt)}
                chatEndRef={chatEndRef}
                onRegenerate={handleRegenerate}
                onCopy={(text) => {
                  navigator.clipboard.writeText(text);
                  toast.success("Copied to clipboard");
                }}
              />
            ) : (
              <PreparePanel
                mode={prepareMode}
                setMode={setPrepareMode}
                doubtInput={doubtInput}
                setDoubtInput={setDoubtInput}
                onDoubt={handleDoubt}
                doubtAnswer={doubtAnswer}
                doubtLoading={doubtLoading}
                quiz={quiz}
                setQuiz={setQuiz}
                quizLoading={quizLoading}
                quizAnswers={quizAnswers}
                setQuizAnswers={setQuizAnswers}
                quizSubmitted={quizSubmitted}
                setQuizSubmitted={setQuizSubmitted}
                onGenerateQuiz={handleGenerateQuiz}
                revision={revision}
                revisionLoading={revisionLoading}
                onRevision={handleRevision}
              />
            )}
          </div>
        </Card>

        {/* RIGHT PANEL: PYQ Analyzer */}
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <FileText className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold">PYQ Analyzer</span>
            {rightView === "pyq_results" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRightView("overview")}
                className="ml-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Overview
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-auto scrollbar-thin">
            {rightView === "overview" ? (
              <OverviewPanel
                pdf={pdf}
                onLearn={() => setLeftTab("learn")}
                onPrepare={() => setLeftTab("prepare")}
                onPyq={() => setRightView("pyq")}
              />
            ) : rightView === "pyq" ? (
              <PyqUploadPanel
                onAnalyze={handleAnalyzePyq}
                loading={pyqLoading}
                onFileSelect={handlePyqUpload}
                fileName={pyqFileName}
                extracting={pyqExtracting}
                extracted={pyqContent.length > 0}
              />
            ) : (
              <PyqResultsPanel
                questions={pyqQuestions}
                frequency={pyqFrequency}
                trends={pyqTrends}
                important={pyqImportant}
                duplicates={pyqDuplicates}
                answers={pyqAnswers}
                answerLoading={pyqAnswerLoading}
                onGenerateAnswer={handleGenerateAnswer}
                onSendToAssistant={handleSendToAssistant}
                onExport={exportReport}
                loading={pyqLoading}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ===== MARKDOWN RENDERER =====
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent = "";
  let codeLang = "";
  let inList = false;
  let listItems: string[] = [];

  lines.forEach((line, i) => {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="my-2 rounded-lg bg-foreground/5 dark:bg-black/30 p-3 overflow-x-auto text-xs">
            <code className="font-mono">{codeContent}</code>
          </pre>
        );
        codeContent = "";
        inCodeBlock = false;
      } else {
        codeLang = line.trim().slice(3);
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeContent += line + "\n";
      return;
    }

    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      listItems.push(line.trim().slice(2));
      inList = true;
      return;
    } else if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`list-${i}`} className="my-1 space-y-1 ml-4">
          {listItems.map((item, j) => (
            <li key={j} className="text-sm flex items-start gap-1.5">
              <span className="text-primary mt-0.5">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }

    if (line.trim().startsWith("### ")) {
      elements.push(<h4 key={`h4-${i}`} className="text-sm font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: formatInline(line.trim().slice(4)) }} />);
    } else if (line.trim().startsWith("## ")) {
      elements.push(<h3 key={`h3-${i}`} className="text-base font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: formatInline(line.trim().slice(3)) }} />);
    } else if (line.trim().startsWith("# ")) {
      elements.push(<h2 key={`h2-${i}`} className="text-lg font-bold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: formatInline(line.trim().slice(2)) }} />);
    } else if (line.trim().startsWith("| ") && line.includes("|")) {
      // Table row
      const cells = line.split("|").filter((c) => c.trim());
      if (line.includes("---")) return; // skip separator
      elements.push(
        <div key={`table-${i}`} className="my-1 flex gap-2">
          {cells.map((cell, j) => (
            <span key={j} className="text-xs flex-1 px-2 py-1 rounded bg-secondary" dangerouslySetInnerHTML={{ __html: formatInline(cell.trim()) }} />
          ))}
        </div>
      );
    } else if (line.trim()) {
      elements.push(<p key={`p-${i}`} className="text-sm my-1" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />);
    }
  });

  if (listItems.length > 0) {
    elements.push(
      <ul key="list-final" className="my-1 space-y-1 ml-4">
        {listItems.map((item, j) => (
          <li key={j} className="text-sm flex items-start gap-1.5">
            <span className="text-primary mt-0.5">•</span>
            <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          </li>
        ))}
      </ul>
    );
  }

  return elements;
}

function formatInline(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="text-xs px-1 py-0.5 rounded bg-secondary font-mono">$1</code>');
}

// ===== LEARN PANEL =====
function LearnPanel({
  messages, input, setInput, onSend, loading, loadingMsg, suggestionChips, onSuggestion, chatEndRef, onRegenerate, onCopy,
}: {
  messages: ChatMsg[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  loadingMsg: string;
  suggestionChips: { icon: any; label: string; prompt: string }[];
  onSuggestion: (prompt: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
  onRegenerate: () => void;
  onCopy: (text: string) => void;
}) {
  return (
    <>
      <div className="flex-1 overflow-auto scrollbar-thin p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mb-4"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <p className="text-base font-semibold max-w-sm">
              Hi! I've finished reading your document. You can ask me anything about it. I will explain concepts in simple language, generate quizzes, solve doubts and help you prepare for exams.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 w-full max-w-sm">
              {suggestionChips.map((s, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onSuggestion(s.prompt)}
                  disabled={loading}
                  className="flex items-center gap-2 text-left text-sm px-3 py-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all disabled:opacity-50"
                >
                  <s.icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{s.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex gap-3 group", msg.role === "user" ? "justify-end" : "")}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={cn("max-w-[80%]", msg.role === "user" && "flex flex-col items-end")}>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : msg.error
                      ? "bg-destructive/10 text-destructive rounded-bl-sm"
                      : "bg-secondary rounded-bl-sm"
                  )}
                >
                  {msg.role === "assistant" && !msg.error ? (
                    <div className="space-y-1">{renderMarkdown(msg.content)}</div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "assistant" && !msg.error && (
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    {/* Source indicator */}
                    {msg.sourceType === "document" ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="w-3 h-3 text-success" /> Source: Uploaded Document
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Globe className="w-3 h-3 text-accent" /> Source: General AI Knowledge
                      </span>
                    )}
                    {msg.confidence && (
                      <Badge
                        className={cn(
                          "px-2 py-0.5",
                          msg.confidence > 0.8
                            ? "bg-success/10 text-success"
                            : msg.confidence > 0.6
                            ? "bg-warning/10 text-warning"
                            : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {Math.round(msg.confidence * 100)}%
                      </Badge>
                    )}
                    <button
                      onClick={() => onCopy(msg.content)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={onRegenerate}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && msg.sourceType === "document" && (
                  <div className="mt-1 space-y-0.5">
                    {msg.sources.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-success" />
                        Page {s.page} — "{s.text}..."
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-xs font-bold">
                  You
                </div>
              )}
            </motion.div>
          ))
        )}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-3">
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

      {/* Input */}
      <div className="p-4 border-t border-border">
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
            placeholder="Ask a question about your document..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-h-32"
          />
          <Button size="icon" onClick={onSend} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

// ===== PREPARE PANEL =====
function PreparePanel({
  mode, setMode, doubtInput, setDoubtInput, onDoubt, doubtAnswer, doubtLoading,
  quiz, setQuiz, quizLoading, quizAnswers, setQuizAnswers, quizSubmitted, setQuizSubmitted,
  onGenerateQuiz, revision, revisionLoading, onRevision,
}: any) {
  const modes = [
    { id: "doubt", label: "Doubt Solver", icon: HelpCircle },
    { id: "quiz", label: "Quiz Generator", icon: FileQuestion },
    { id: "revision", label: "Last Minute Revision", icon: Zap },
  ];

  return (
    <>
      <div className="flex gap-1 p-3 border-b border-border">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              mode === m.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
            )}
          >
            <m.icon className="w-3.5 h-3.5" /> {m.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-4">
        {mode === "doubt" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <HelpCircle className="w-10 h-10 text-primary mx-auto mb-2" />
              <p className="font-medium">Ask any doubt</p>
              <p className="text-sm text-muted-foreground">Get instant clarification on any topic</p>
            </div>
            <div className="flex gap-2">
              <input
                value={doubtInput}
                onChange={(e) => setDoubtInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onDoubt()}
                placeholder="What's your doubt?"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button onClick={onDoubt} loading={doubtLoading} disabled={!doubtInput.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {doubtLoading && (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground animate-pulse">Thinking...</span>
              </div>
            )}
            {doubtAnswer && !doubtLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-secondary p-4 text-sm space-y-1"
              >
                {renderMarkdown(doubtAnswer)}
              </motion.div>
            )}
          </div>
        )}

        {mode === "quiz" && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <FileQuestion className="w-10 h-10 text-primary mx-auto mb-2" />
              <p className="font-medium">Generate a Quiz</p>
              <p className="text-sm text-muted-foreground">Test your knowledge with AI-generated questions</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "mcq", label: "MCQs" },
                { id: "true_false", label: "True/False" },
                { id: "short_answer", label: "Short Answer" },
              ].map((t) => (
                <Button
                  key={t.id}
                  variant="outline"
                  size="sm"
                  onClick={() => onGenerateQuiz(t.id)}
                  loading={quizLoading}
                >
                  {t.label}
                </Button>
              ))}
            </div>

            {quizLoading && (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            )}

            {quiz.length > 0 && !quizLoading && (
              <div className="space-y-4">
                {quiz.map((q: any, i: number) => (
                  <div key={i} className="rounded-xl border border-border p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <Badge className="bg-primary/10 text-primary">
                        {q.type.replace("_", " ").toUpperCase()}
                      </Badge>
                      <p className="text-sm font-medium flex-1">{q.question}</p>
                    </div>
                    {q.options && (
                      <div className="space-y-2">
                        {q.options.map((opt: string, j: number) => {
                          const isSelected = quizAnswers[i] === opt;
                          const isCorrect = quizSubmitted && opt === q.answer;
                          const isWrong = quizSubmitted && isSelected && opt !== q.answer;
                          return (
                            <button
                              key={j}
                              onClick={() => !quizSubmitted && setQuizAnswers({ ...quizAnswers, [i]: opt })}
                              className={cn(
                                "w-full text-left text-sm px-3 py-2 rounded-lg border transition-all",
                                isCorrect
                                  ? "bg-success/10 border-success text-success"
                                  : isWrong
                                  ? "bg-destructive/10 border-destructive text-destructive"
                                  : isSelected
                                  ? "bg-primary/10 border-primary"
                                  : "border-border hover:bg-secondary"
                              )}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {q.type === "true_false" && (
                      <div className="flex gap-2">
                        {["True", "False"].map((opt) => {
                          const isSelected = quizAnswers[i] === opt;
                          const isCorrect = quizSubmitted && opt === q.answer;
                          const isWrong = quizSubmitted && isSelected && opt !== q.answer;
                          return (
                            <button
                              key={opt}
                              onClick={() => !quizSubmitted && setQuizAnswers({ ...quizAnswers, [i]: opt })}
                              className={cn(
                                "flex-1 text-sm px-3 py-2 rounded-lg border transition-all",
                                isCorrect
                                  ? "bg-success/10 border-success text-success"
                                  : isWrong
                                  ? "bg-destructive/10 border-destructive text-destructive"
                                  : isSelected
                                  ? "bg-primary/10 border-primary"
                                  : "border-border hover:bg-secondary"
                              )}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {q.type === "short_answer" && (
                      <textarea
                        placeholder="Type your answer..."
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        rows={2}
                        onChange={(e) => setQuizAnswers({ ...quizAnswers, [i]: e.target.value })}
                      />
                    )}
                    {quizSubmitted && q.explanation && (
                      <p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p>
                    )}
                    {quizSubmitted && q.type === "short_answer" && (
                      <div className="mt-2 rounded-lg bg-secondary p-3 text-sm">
                        <p className="text-xs text-muted-foreground mb-1">Model Answer:</p>
                        {q.answer}
                      </div>
                    )}
                  </div>
                ))}
                {!quizSubmitted ? (
                  <Button onClick={() => setQuizSubmitted(true)} variant="gradient" className="w-full">
                    Submit Quiz
                  </Button>
                ) : (
                  <div className="text-center">
                    <p className="text-lg font-semibold">
                      Score:{" "}
                      {Object.entries(quizAnswers).filter(([i, a]) => a === quiz[parseInt(i)].answer).length} /{" "}
                      {quiz.length}
                    </p>
                    <Button
                      onClick={() => {
                        setQuiz([]);
                        setQuizAnswers({});
                        setQuizSubmitted(false);
                      }}
                      variant="outline"
                      className="mt-3"
                    >
                      New Quiz
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {mode === "revision" && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <Zap className="w-10 h-10 text-warning mx-auto mb-2" />
              <p className="font-medium">Last Minute Revision</p>
              <p className="text-sm text-muted-foreground">Quick notes to review before your exam</p>
            </div>
            <Button onClick={onRevision} loading={revisionLoading} variant="gradient" className="w-full">
              <Sparkles className="w-4 h-4" /> Generate Revision Notes
            </Button>
            {revisionLoading && (
              <div className="space-y-3">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            )}
            {revision && !revisionLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-semibold mb-2">Quick Notes</p>
                  <div className="space-y-1">{renderMarkdown(revision.notes)}</div>
                </div>
                {revision.keyFormulas?.length > 0 && (
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-sm font-semibold mb-2">Key Formulas</p>
                    <ul className="space-y-1">
                      {revision.keyFormulas.map((f: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {revision.importantDates?.length > 0 && (
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-sm font-semibold mb-2">Important Points</p>
                    <ul className="space-y-1">
                      {revision.importantDates.map((d: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ===== OVERVIEW PANEL =====
function OverviewPanel({
  pdf,
  onLearn,
  onPrepare,
  onPyq,
}: {
  pdf: PdfData;
  onLearn: () => void;
  onPrepare: () => void;
  onPyq: () => void;
}) {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center py-2">
        <div className="w-16 h-20 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold">{pdf.name}</h2>
        <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileStack className="w-4 h-4" /> {pdf.page_count} pages
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" /> {formatReadingTime(pdf.reading_time)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" /> {formatDate(pdf.created_at)}
          </span>
        </div>
      </div>

      {pdf.topics?.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-3">Detected Topics</p>
          <div className="flex flex-wrap gap-2">
            {pdf.topics.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-primary/10 text-primary"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> {t}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-semibold">What would you like to do?</p>
        <button
          onClick={onLearn}
          className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-left flex-1">
            <p className="font-medium group-hover:text-primary transition-colors">Start Learning</p>
            <p className="text-xs text-muted-foreground">Understand concepts with AI</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        <button
          onClick={onPrepare}
          className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-left flex-1">
            <p className="font-medium group-hover:text-primary transition-colors">Prepare for Exam</p>
            <p className="text-xs text-muted-foreground">Quizzes, doubts, revision</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        <button
          onClick={onPyq}
          className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-violet-500" />
          </div>
          <div className="text-left flex-1">
            <p className="font-medium group-hover:text-primary transition-colors">Analyze PYQs</p>
            <p className="text-xs text-muted-foreground">Upload previous year questions</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </div>
    </div>
  );
}

// ===== PYQ UPLOAD PANEL =====
function PyqUploadPanel({
  onAnalyze,
  loading,
  onFileSelect,
  fileName,
  extracting,
  extracted,
}: {
  onAnalyze: () => void;
  loading: boolean;
  onFileSelect: (file: File) => void;
  fileName: string;
  extracting: boolean;
  extracted: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="p-6 flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <Upload className="w-8 h-8 text-accent" />
      </div>
      <h2 className="text-lg font-semibold">Upload Previous Year Questions</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        Upload one or multiple PYQ PDFs and AI will analyze question patterns, frequency, and trends
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) onFileSelect(f);
        }}
        onClick={() => !extracting && fileRef.current?.click()}
        className={cn(
          "mt-6 w-full max-w-sm rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          extracting && "opacity-60 pointer-events-none"
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileSelect(f);
          }}
        />
        {extracting ? (
          <div className="flex items-center justify-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-muted-foreground animate-pulse">Extracting text from PDF...</span>
          </div>
        ) : fileName ? (
          <div className="flex items-center justify-center gap-2 text-sm">
            <FileText className={cn("w-4 h-4", extracted ? "text-success" : "text-muted-foreground")} />
            <span className="font-medium truncate">{fileName}</span>
            {extracted && <CheckCircle2 className="w-4 h-4 text-success" />}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Click or drag to upload PYQ PDF</p>
        )}
      </div>

      <Button
        onClick={onAnalyze}
        loading={loading}
        variant="gradient"
        className="mt-6"
        disabled={(!fileName && !loading) || extracting}
      >
        <Sparkles className="w-4 h-4" /> Analyze PYQs
      </Button>
      <p className="text-xs text-muted-foreground mt-4">
        AI will use your study material to generate answers and identify patterns
      </p>
    </div>
  );
}

// ===== PYQ RESULTS PANEL =====
function PyqResultsPanel({
  questions,
  frequency,
  trends,
  important,
  duplicates,
  answers,
  answerLoading,
  onGenerateAnswer,
  onSendToAssistant,
  onExport,
  loading,
}: any) {
  const [activeTab, setActiveTab] = useState<PyqTab>("questions");

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="animate-pulse">Analyzing document...</span>
        </div>
        <Skeleton className="h-8 w-48" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const tabs: { id: PyqTab; label: string; icon: any }[] = [
    { id: "questions", label: "Questions", icon: FileText },
    { id: "frequency", label: "Frequency", icon: BarChart3 },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "chapters", label: "Important", icon: Target },
    { id: "duplicates", label: "Duplicates", icon: Repeat },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex gap-1 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                activeTab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={onExport}>
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-4">
        {activeTab === "questions" && (
          <div className="space-y-3">
            {questions.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No questions detected</div>
            ) : (
              questions.map((q: string, i: number) => (
                <div
                  key={i}
                  className="rounded-xl border border-border p-3 hover:border-primary/30 transition-colors"
                >
                  <p className="text-sm font-medium mb-2">
                    Q{i + 1}. {q}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onGenerateAnswer(q)}
                      loading={answerLoading === q}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Generate Answer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onSendToAssistant(q)}>
                      <Brain className="w-3.5 h-3.5" /> Ask Assistant
                    </Button>
                  </div>
                  {answers[q] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 rounded-lg bg-secondary p-3 text-sm space-y-1 overflow-hidden"
                    >
                      {renderMarkdown(answers[q])}
                    </motion.div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "frequency" && (
          <div className="space-y-3">
            <p className="text-sm font-semibold mb-2">Topic Frequency Analysis</p>
            {frequency.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No frequency data</div>
            ) : (
              frequency.map((f: any, i: number) => {
                const maxCount = Math.max(...frequency.map((x: any) => x.count));
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm w-32 truncate">{f.topic}</span>
                    <div className="flex-1 h-6 rounded-lg bg-secondary overflow-hidden">
                      <div
                        className="h-full gradient-bg flex items-center justify-end px-2 transition-all duration-500"
                        style={{ width: `${(f.count / maxCount) * 100}%` }}
                      >
                        <span className="text-xs text-white font-medium">{f.count}x</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "trends" && (
          <div className="space-y-3">
            <p className="text-sm font-semibold mb-2">Trend Analysis</p>
            {trends.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No trend data</div>
            ) : (
              trends.map((t: any, i: number) => (
                <div key={i} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-medium mb-2">{t.year}</p>
                  <div className="flex flex-wrap gap-2">
                    {t.topics.map((topic: string, j: number) => (
                      <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "chapters" && (
          <div className="space-y-3">
            <p className="text-sm font-semibold mb-2">Important Chapters to Focus On</p>
            {important.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No important chapters detected</div>
            ) : (
              important.map((c: string, i: number) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center text-warning font-bold text-sm">
                    {i + 1}
                  </div>
                  <span className="text-sm font-medium">{c}</span>
                  <CheckCircle2 className="w-4 h-4 text-success ml-auto" />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "duplicates" && (
          <div className="space-y-3">
            <p className="text-sm font-semibold mb-2">Duplicate Question Detection</p>
            {duplicates.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No duplicate questions found
              </div>
            ) : (
              duplicates.map((d: any, i: number) => (
                <div key={i} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium flex-1">{d.question}</p>
                    <Badge className="bg-warning/10 text-warning ml-2">{d.count}x repeated</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
