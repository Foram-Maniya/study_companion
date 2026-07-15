import { useCallback, useRef, useState } from "react";
import { extractPdfText } from "@/lib/extractPdfText";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  UploadCloud,
  X,
  CheckCircle2,
  Sparkles,
  Clock,
  FileStack,
  BookOpen,
  Pencil,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatReadingTime, cn, arrayBufferToBase64 } from "@/lib/utils";

type Stage = "idle" | "uploading" | "processing" | "done" | "error";

interface UploadResult {
  id: string;
  name: string;
  pageCount: number;
  readingTime: number;
  topics: string[];
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export default function UploadPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [renameModal, setRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const handleFile = useCallback((f: File) => {
    if (f.type !== "application/pdf") {
      toast.error("Invalid file type", "Please upload a PDF file");
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error("File too large", "Maximum file size is 10MB");
      return;
    }
    setFile(f);
    setStage("uploading");
    setProgress(0);
    uploadFile(f);
  }, [toast]);

  async function uploadFile(f: File) {
    const fileExt = f.name.split(".").pop();
    const fileName = `${user?.id}/${crypto.randomUUID()}.${fileExt}`;

    // Simulate progress for UX
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 200);

    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(fileName, f);

    clearInterval(progressInterval);
    setProgress(100);

    if (uploadError) {
      toast.error("Upload failed", uploadError.message);
      setStage("error");
      return;
    }

    setStage("processing");

    // Insert into database first with processing status
    const { data, error } = await supabase
      .from("pdfs")
      .insert({
        name: f.name.replace(/\.pdf$/i, ""),
        file_path: fileName,
        file_size: f.size,
        page_count: 0,
        reading_time: 0,
        topics: [],
        content: "",
        status: "processing",
      })
      .select()
      .single();

    if (error || !data) {
      toast.error("Failed to save", error?.message || "Unknown error");
      setStage("error");
      return;
    }

    // Read file as base64 and send to process-pdf edge function for real text extraction
    const fileArrayBuffer = await f.arrayBuffer();
    const fileBase64 = arrayBufferToBase64(fileArrayBuffer);
    // Extract PDF text locally
const { text: extractedText, pageCount: extractedPageCount } = await extractPdfText(f);

console.log("Extracted text length:", extractedText.length);
console.log("Extracted pages:", extractedPageCount);

    let pageCount = 0;
    let readingTime = 0;
    let detectedTopics: string[] = ["General Topics"];

    try {
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
            pdfId: data.id,
            fileContent: fileBase64,
            extractedText,
            pageCount: extractedPageCount,
          }),
        }
      );

      if (processRes.ok) {
        const processData = await processRes.json();
        pageCount = processData.pageCount || Math.max(1, Math.round(f.size / 50000));
        detectedTopics = processData.topics || ["General Topics"];
      } else {
        pageCount = Math.max(1, Math.round(f.size / 50000));
      }
    } catch {
      pageCount = Math.max(1, Math.round(f.size / 50000));
    }

    readingTime = pageCount * 3;

    // Update the PDF record with final page count, reading time, and topics
    await supabase
      .from("pdfs")
      .update({
        page_count: pageCount,
        reading_time: readingTime,
        topics: detectedTopics,
        status: "ready",
      })
      .eq("id", data.id);

    setResult({
      id: data.id,
      name: data.name,
      pageCount,
      readingTime,
      topics: detectedTopics,
    });

    setStage("done");
    toast.success("Upload complete!", "Your PDF is ready to study");
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  function reset() {
    setFile(null);
    setResult(null);
    setStage("idle");
    setProgress(0);
  }

  async function handleRename() {
    if (!result || !renameValue.trim()) return;
    const { error } = await supabase
      .from("pdfs")
      .update({ name: renameValue.trim() })
      .eq("id", result.id);
    if (error) {
      toast.error("Rename failed", error.message);
    } else {
      setResult({ ...result, name: renameValue.trim() });
      toast.success("Renamed successfully");
      setRenameModal(false);
    }
  }

  async function handleDelete() {
    if (!result) return;
    await supabase.from("pdfs").delete().eq("id", result.id);
    toast.success("Deleted");
    reset();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Study Material</h1>
        <p className="text-muted-foreground mt-1">Upload a PDF and let AI help you master it</p>
      </div>

      <AnimatePresence mode="wait">
        {/* Idle / Drag & Drop */}
        {stage === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all",
                dragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-secondary/30"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <motion.div
                animate={dragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6"
              >
                <UploadCloud className="w-10 h-10 text-white" />
              </motion.div>
              <p className="text-lg font-semibold">
                {dragging ? "Drop your PDF here" : "Drag & drop your PDF"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse files
              </p>
              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> PDF format only
                </span>
                <span className="flex items-center gap-1">
                  <FileStack className="w-3.5 h-3.5" /> Max 10MB
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Uploading */}
        {(stage === "uploading" || stage === "processing") && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="p-8 text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0"
                >
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r="44"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="4"
                      strokeDasharray={2 * Math.PI * 44}
                      strokeDashoffset={2 * Math.PI * 44 * (1 - progress / 100)}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                      className="transition-all duration-300"
                    />
                  </svg>
                </motion.div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {stage === "processing" ? (
                    <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                  ) : (
                    <span className="text-xl font-bold">{Math.round(progress)}%</span>
                  )}
                </div>
              </div>

              <p className="text-lg font-semibold">
                {stage === "uploading" ? "Uploading..." : "AI is analyzing your PDF..."}
              </p>
              <p className="text-sm text-muted-foreground mt-1 truncate max-w-sm mx-auto">
                {file?.name}
              </p>

              {stage === "processing" && (
                <div className="mt-6 space-y-2 max-w-xs mx-auto">
                  {["Extracting text", "Detecting topics", "Estimating reading time"].map((step, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.4 }}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      {step}
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Done */}
        {stage === "done" && result && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Upload Complete!</p>
                  <p className="text-sm text-muted-foreground">Your PDF is ready to study</p>
                </div>
              </div>

              {/* Document Overview */}
              <div className="rounded-xl border border-border p-5 bg-secondary/30">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-20 rounded-lg gradient-bg flex items-center justify-center shrink-0">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-lg truncate">{result.name}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <FileStack className="w-4 h-4" /> {result.pageCount} pages
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" /> {formatReadingTime(result.readingTime)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detected Topics */}
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Detected Topics</p>
                  <div className="flex flex-wrap gap-2">
                    {result.topics.map((t) => (
                      <span key={t} className="flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-primary/10 text-primary">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={() => navigate(`/workspace/${result.id}`)}
                  className="flex-1"
                >
                  <BookOpen className="w-5 h-5" /> Open Workspace
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => { setRenameValue(result.name); setRenameModal(true); }}
                >
                  <Pencil className="w-4 h-4" /> Rename
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              </div>

              <button
                onClick={reset}
                className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
              >
                Upload another PDF <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Card>
          </motion.div>
        )}

        {/* Error */}
        {stage === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-lg font-semibold">Upload failed</p>
              <p className="text-sm text-muted-foreground mt-1">Something went wrong. Please try again.</p>
              <Button onClick={reset} variant="gradient" className="mt-6">
                Try Again
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Modal */}
      <Modal
        open={renameModal}
        onClose={() => setRenameModal(false)}
        title="Rename PDF"
        description="Enter a new name for this document"
      >
        <div className="space-y-4">
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Document name"
            autoFocus
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setRenameModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleRename} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
