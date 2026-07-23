import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  Calendar,
  FileStack,
  CheckCircle2,
  Upload,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { aiService } from "@/services/aiService";
import { formatReadingTime, formatDate, arrayBufferToBase64, cn } from "@/lib/utils";

import WorkspaceHeader from "@/components/workspace/WorkspaceHeader";
import LearnMode from "@/components/workspace/StudyAssistant/LearnMode";
import PrepareMode from "@/components/workspace/StudyAssistant/PrepareMode";
import PYQAnalyzer from "@/components/workspace/PYQAnalyzer/PYQAnalyzer";
import type { PyqFileItem } from "@/components/workspace/PYQAnalyzer/PYQUploadZone";
import type { PyqLibraryRecord } from "@/components/workspace/PYQAnalyzer/PYQLibrary";

import type {
  PdfData,
  ChatMsg,
  LayoutMode,
  LeftTab,
  PrepareSubMode,
  QuizType,
  RevisionData,
  Flashcard,
  PyqInsight,
} from "@/types/workspace";

const LOADING_MESSAGES = [
  "Thinking...",
  "Analyzing study material...",
  "Formatting study notes...",
  "Searching through document...",
];

export default function StudyWorkspace() {
  const { pdfId } = useParams<{ pdfId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  // Core workspace state
  const [pdf, setPdf] = useState<PdfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("split");
  const [leftTab, setLeftTab] = useState<LeftTab>("learn");
  const [prepareSubMode, setPrepareSubMode] = useState<PrepareSubMode>("doubt");

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Prepare sub-mode states
  const [doubtInput, setDoubtInput] = useState("");
  const [doubtAnswer, setDoubtAnswer] = useState<string | null>(null);
  const [doubtLoading, setDoubtLoading] = useState(false);

  const [quiz, setQuiz] = useState<any[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const [essayQuestions, setEssayQuestions] = useState<any[]>([]);
  const [essayLoading, setEssayLoading] = useState(false);

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardLoading, setFlashcardLoading] = useState(false);

  const [vivaQ, setVivaQ] = useState<string | null>(null);
  const [vivaHistory, setVivaHistory] = useState<{ q: string; a: string; feedback?: string }[]>([]);
  const [vivaInput, setVivaInput] = useState("");
  const [vivaLoading, setVivaLoading] = useState(false);

  const [revision, setRevision] = useState<RevisionData | null>(null);
  const [revisionLoading, setRevisionLoading] = useState(false);

  // Shared Intelligence Insight State (from PYQ → Assistant)
  const [pyqInsight, setPyqInsight] = useState<PyqInsight | null>(null);

  // PYQ state
  const [pyqUploaded, setPyqUploaded] = useState(false);
  const [pyqFiles, setPyqFiles] = useState<PyqFileItem[]>([]);
  const [pyqLibraryRecords, setPyqLibraryRecords] = useState<PyqLibraryRecord[]>([]);
  const [pyqLoading, setPyqLoading] = useState(false);
  const [pyqQuestions, setPyqQuestions] = useState<any[]>([]);
  const [pyqFrequency, setPyqFrequency] = useState<any[]>([]);
  const [pyqTrends, setPyqTrends] = useState<any[]>([]);
  const [pyqImportant, setPyqImportant] = useState<any[]>([]);
  const [pyqDuplicates, setPyqDuplicates] = useState<any[]>([]);
  const [pyqAnswers, setPyqAnswers] = useState<Record<string, string>>({});
  const [answerLoading, setAnswerLoading] = useState<string | null>(null);

  useEffect(() => {
    if (pdfId) {
      loadPdf(pdfId);
      loadChats(pdfId);
      loadPyqAnalyses(pdfId);
    }
  }, [pdfId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (chatLoading) {
      const interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [chatLoading]);

  async function loadPdf(id: string) {
    const { data } = await supabase.from("pdfs").select("*").eq("id", id).maybeSingle();
    if (data) {
      setPdf(data);
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
          created_at: c.created_at,
        }))
      );
    }
  }

  async function loadPyqAnalyses(id: string) {
    const { data } = await supabase
      .from("pyq_analyses")
      .select("*")
      .eq("pdf_id", id)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      setPyqUploaded(true);
      const latest = data[0];
      setPyqQuestions(latest.questions || []);
      setPyqFrequency(latest.frequency || []);
      setPyqTrends(latest.trends || []);
      setPyqImportant(latest.important_chapters || []);

      setPyqLibraryRecords(
        data.map((item) => ({
          id: item.id,
          file_name: item.pyq_file_path || "Previous Year Paper",
          questions_count: item.questions?.length || 0,
          created_at: item.created_at,
        }))
      );
    }
  }

  // Handle Multi-PYQ file selection
  async function handleAddPyqFiles(files: File[]) {
    setPyqUploaded(true);

    const newItems: PyqFileItem[] = files.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      name: f.name,
      content: "",
      extracting: true,
      extracted: false,
    }));

    setPyqFiles((prev) => [...prev, ...newItems]);

    // Extract text from each PDF sequentially
    for (const item of newItems) {
      try {
        const fileArrayBuffer = await item.file.arrayBuffer();
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
            body: JSON.stringify({ pdfId: null, fileContent: fileBase64 }),
          }
        );

        if (processRes.ok) {
          const processData = await processRes.json();
          setPyqFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? { ...f, content: processData.text || "", extracting: false, extracted: true }
                : f
            )
          );
        } else {
          setPyqFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, extracting: false } : f))
          );
        }
      } catch {
        setPyqFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, extracting: false } : f))
        );
      }
    }
  }

  function handleRemovePyqFile(id: string) {
    setPyqFiles((prev) => prev.filter((f) => f.id !== id));
  }

  // Merge text from all uploaded PYQ papers & analyze
  async function handleAnalyzeAllPyqs() {
    if (!pdf) return;
    setPyqLoading(true);

    const combinedPyqText = pyqFiles
      .map((f) => `--- PAPER: ${f.name} ---\n${f.content}`)
      .join("\n\n");

    try {
      const res = await aiService.analyzePyq(
        pdf.id,
        combinedPyqText || pdf.content || "",
        pdf.content || pdf.name
      );

      setPyqQuestions(res.questions || []);
      setPyqFrequency(res.frequency || []);
      setPyqTrends(res.trends || []);
      setPyqImportant(res.importantChapters || []);
      setPyqDuplicates(res.duplicates || []);

      const fileNameList = pyqFiles.map((f) => f.name).join(", ");
      await supabase.from("pyq_analyses").insert({
        pdf_id: pdf.id,
        pyq_file_path: fileNameList || "Multi-PYQ Set",
        questions: res.questions,
        frequency: res.frequency,
        trends: res.trends,
        important_chapters: res.importantChapters,
      });

      toast.success("PYQ Analysis Complete", "Merged patterns extracted");
      loadPyqAnalyses(pdf.id);
    } catch {
      toast.error("PYQ analysis failed", "Please try again");
    }

    setPyqLoading(false);
  }

  async function handleGeneratePyqAnswer(question: string, marks?: number): Promise<string> {
    if (!pdf) return "No pdf loaded";
    setAnswerLoading(question);
    try {
      const answer = await aiService.generateAnswer(question, pdf.content || pdf.name, marks);
      setPyqAnswers((prev) => ({ ...prev, [question]: answer }));
      setAnswerLoading(null);
      return answer;
    } catch {
      setAnswerLoading(null);
      return "Unable to generate answer. Please try again.";
    }
  }

  function handleSendInsightToAssistant(insight: PyqInsight) {
    setPyqInsight(insight);
    setLeftTab("learn");
    toast.info("PYQ Insight Sent to Assistant", "Check the left panel");
  }

  // Handle Send Question in Learn Mode
  const handleSend = useCallback(
    async (questionText?: string) => {
      const q = questionText || input.trim();
      if (!q || !pdf || chatLoading) return;

      const userMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: "user",
        content: q,
        created_at: new Date().toISOString(),
      };
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
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);

        await supabase.from("chats").insert({
          pdf_id: pdf.id,
          role: "assistant",
          content: res.answer,
          sources: { sources: res.sources, confidence: res.confidence, sourceType: aiMsg.sourceType },
          mode: "learn",
        });

        if (pdf.progress < 100) {
          const newProgress = Math.min(100, pdf.progress + 5);
          setPdf({ ...pdf, progress: newProgress });
          await supabase.from("pdfs").update({ progress: newProgress }).eq("id", pdf.id);
        }
      } catch {
        const errMsg: ChatMsg = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Unable to reach AI Tutor. Please try again.",
          error: true,
        };
        setMessages((prev) => [...prev, errMsg]);
      }

      setChatLoading(false);
    },
    [pdf, chatLoading, input, messages]
  );

  async function handleRegenerate() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((prev) => {
      const copy = [...prev];
      if (copy[copy.length - 1]?.role === "assistant") copy.pop();
      return copy;
    });
    handleSend(lastUser.content);
  }

  // Prepare Handlers
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

  async function handleGenerateEssayQs(markType: "short" | "long") {
    if (!pdf) return;
    setEssayLoading(true);
    setEssayQuestions([]);
    try {
      const res = await aiService.generateEssayQuestions(pdf.id, markType, pdf.content || pdf.name);
      setEssayQuestions(res);
    } catch {
      toast.error("Failed to generate questions");
    }
    setEssayLoading(false);
  }

  async function handleGenerateFlashcards() {
    if (!pdf) return;
    setFlashcardLoading(true);
    setFlashcards([]);
    try {
      const cards = await aiService.generateFlashcards(pdf.id, pdf.content || pdf.name);
      setFlashcards(
        cards.map((c: any, i: number) => ({
          id: String(i),
          front: c.front || c.question || "Term",
          back: c.back || c.answer || "Definition",
        }))
      );
    } catch {
      toast.error("Failed to generate flashcards");
    }
    setFlashcardLoading(false);
  }

  async function handleStartViva() {
    if (!pdf) return;
    setVivaLoading(true);
    try {
      const res = await aiService.askQuestion(
        pdf.id,
        "Act as a university examiner. Ask me ONE sharp viva question from this material.",
        [],
        pdf.content || pdf.name
      );
      setVivaQ(res.answer);
    } catch {
      toast.error("Failed to start viva session");
    }
    setVivaLoading(false);
  }

  async function handleSubmitVivaAnswer() {
    if (!vivaQ || !vivaInput.trim() || !pdf) return;
    setVivaLoading(true);
    try {
      const feedback = await aiService.evaluateVivaAnswer(vivaQ, vivaInput, pdf.content || pdf.name);
      setVivaHistory((prev) => [{ q: vivaQ, a: vivaInput, feedback }, ...prev]);
      setVivaInput("");
      const nextQ = await aiService.askQuestion(
        pdf.id,
        "Ask me the next viva question.",
        [],
        pdf.content || pdf.name
      );
      setVivaQ(nextQ.answer);
    } catch {
      toast.error("Failed to evaluate viva answer");
    }
    setVivaLoading(false);
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
        content: JSON.stringify(res),
        type: "revision",
      });
    } catch {
      toast.error("Failed to generate revision sheet");
    }
    setRevisionLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[75vh] rounded-2xl" />
          <Skeleton className="h-[75vh] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!pdf) {
    return (
      <div className="text-center py-20">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h2 className="text-lg font-bold">Material Not Found</h2>
        <p className="text-sm text-muted-foreground mt-1">The requested study material does not exist.</p>
        <Button onClick={() => navigate("/library")} className="mt-4">
          Back to Study Library
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top Header Controls */}
      <WorkspaceHeader
        pdf={pdf}
        layoutMode={layoutMode}
        onLayoutChange={setLayoutMode}
        onBack={() => navigate("/library")}
      />

      {/* Parallel Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[calc(100vh-10rem)]">
        {/* LEFT PANEL: Study Assistant (Tutor) */}
        <Card
          className={cn(
            "flex flex-col overflow-hidden border-border shadow-lg transition-all duration-300",
            layoutMode === "split" && "block lg:col-span-6",
            layoutMode === "assistant" && "block lg:col-span-12",
            layoutMode === "pyq" && "hidden"
          )}
        >
          <div className="flex items-center justify-between border-b border-border bg-card">
            <div className="flex items-center">
              <button
                onClick={() => setLeftTab("learn")}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors relative",
                  leftTab === "learn" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText className="w-4 h-4" /> Learn
                {leftTab === "learn" && (
                  <motion.div layoutId="left-tab" className="absolute bottom-0 left-0 right-0 h-0.5 gradient-bg" />
                )}
              </button>
              <button
                onClick={() => setLeftTab("prepare")}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors relative",
                  leftTab === "prepare" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Clock className="w-4 h-4" /> Prepare
                {leftTab === "prepare" && (
                  <motion.div layoutId="left-tab" className="absolute bottom-0 left-0 right-0 h-0.5 gradient-bg" />
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {leftTab === "learn" ? (
              <LearnMode
                messages={messages}
                input={input}
                setInput={setInput}
                onSend={handleSend}
                loading={chatLoading}
                loadingMsg={LOADING_MESSAGES[loadingMsgIndex]}
                chatEndRef={chatEndRef}
                onRegenerate={handleRegenerate}
                onCopy={(text) => {
                  navigator.clipboard.writeText(text);
                  toast.success("Copied to clipboard");
                }}
                onSelectQuestionId={(id) => {
                  const el = document.getElementById(`msg-${id}`);
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                pyqInsight={pyqInsight}
                onClearInsight={() => setPyqInsight(null)}
              />
            ) : (
              <PrepareMode
                mode={prepareSubMode}
                setMode={setPrepareSubMode}
                doubtInput={doubtInput}
                setDoubtInput={setDoubtInput}
                onDoubt={handleDoubt}
                doubtAnswer={doubtAnswer}
                doubtLoading={doubtLoading}
                quiz={quiz}
                quizLoading={quizLoading}
                quizAnswers={quizAnswers}
                setQuizAnswers={setQuizAnswers}
                quizSubmitted={quizSubmitted}
                setQuizSubmitted={setQuizSubmitted}
                onGenerateQuiz={handleGenerateQuiz}
                essayQuestions={essayQuestions}
                essayLoading={essayLoading}
                onGenerateEssayQs={handleGenerateEssayQs}
                flashcards={flashcards}
                flashcardLoading={flashcardLoading}
                onGenerateFlashcards={handleGenerateFlashcards}
                vivaQ={vivaQ}
                vivaHistory={vivaHistory}
                vivaInput={vivaInput}
                setVivaInput={setVivaInput}
                vivaLoading={vivaLoading}
                onStartViva={handleStartViva}
                onSubmitVivaAnswer={handleSubmitVivaAnswer}
                revision={revision}
                revisionLoading={revisionLoading}
                onRevision={handleRevision}
                onSendToChat={(q) => {
                  setLeftTab("learn");
                  handleSend(q);
                }}
              />
            )}
          </div>
        </Card>

        {/* RIGHT PANEL: PYQ Analyzer or Initial Overview */}
        <Card
          className={cn(
            "flex flex-col overflow-hidden border-border shadow-lg transition-all duration-300",
            layoutMode === "split" && "block lg:col-span-6",
            layoutMode === "pyq" && "block lg:col-span-12",
            layoutMode === "assistant" && "hidden"
          )}
        >
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-card">
            <FileText className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold">PYQ Analyzer</span>
            {!pyqUploaded && (
              <span className="text-xs text-muted-foreground ml-auto bg-secondary px-2.5 py-0.5 rounded-full">
                Overview Mode
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {!pyqUploaded ? (
              <div className="p-6 space-y-6">
                <div className="text-center py-2">
                  <div className="w-16 h-20 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4 shadow-md">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-lg font-bold">{pdf.name}</h2>
                  <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileStack className="w-3.5 h-3.5" /> {pdf.page_count} pages
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {formatReadingTime(pdf.reading_time)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {formatDate(pdf.created_at)}
                    </span>
                  </div>
                </div>

                {pdf.topics?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Detected Key Topics
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pdf.topics.map((t) => (
                        <span
                          key={t}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border-2 border-dashed border-primary/30 p-6 text-center space-y-3 bg-primary/[0.02]">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold">Unlock PYQ Pattern Analysis</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Upload previous year question papers (2021–2025) to analyze topic frequency, trend charts & unit weightage.
                  </p>
                  <Button
                    onClick={() => {
                      setPyqUploaded(true);
                    }}
                    variant="gradient"
                  >
                    <Upload className="w-4 h-4" /> Open PYQ Analyzer
                  </Button>
                </div>
              </div>
            ) : (
              <PYQAnalyzer
                files={pyqFiles}
                onAddFiles={handleAddPyqFiles}
                onRemoveFile={handleRemovePyqFile}
                onAnalyzeAll={handleAnalyzeAllPyqs}
                analyzing={pyqLoading}
                libraryRecords={pyqLibraryRecords}
                onReanalyzeLibrary={() => handleAnalyzeAllPyqs()}
                onDeleteLibrary={async (id) => {
                  await supabase.from("pyq_analyses").delete().eq("id", id);
                  if (pdfId) loadPyqAnalyses(pdfId);
                }}
                questions={pyqQuestions}
                frequency={pyqFrequency}
                trends={pyqTrends}
                important={pyqImportant}
                duplicates={pyqDuplicates}
                answers={pyqAnswers}
                answerLoading={answerLoading}
                onGenerateAnswer={handleGeneratePyqAnswer}
                onSendToAssistant={handleSendInsightToAssistant}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
