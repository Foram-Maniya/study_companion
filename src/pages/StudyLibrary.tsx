import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Upload,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Clock,
  Calendar,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar, Skeleton, EmptyState } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { formatDate, formatReadingTime, cn } from "@/lib/utils";

interface PdfItem {
  id: string;
  name: string;
  file_size: number;
  page_count: number;
  reading_time: number;
  topics: string[];
  progress: number;
  status: string;
  created_at: string;
}

export default function StudyLibrary() {
  const navigate = useNavigate();
  const toast = useToast();
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renameModal, setRenameModal] = useState<PdfItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteModal, setDeleteModal] = useState<PdfItem | null>(null);

  useEffect(() => {
    loadPdfs();
  }, []);

  async function loadPdfs() {
    setLoading(true);
    const { data } = await supabase
      .from("pdfs")
      .select("*")
      .order("created_at", { ascending: false });
    setPdfs(data || []);
    setLoading(false);
  }

  const filtered = pdfs.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleRename() {
    if (!renameModal || !renameValue.trim()) return;
    const { error } = await supabase
      .from("pdfs")
      .update({ name: renameValue.trim() })
      .eq("id", renameModal.id);
    if (error) {
      toast.error("Rename failed", error.message);
    } else {
      toast.success("Renamed successfully");
      setPdfs((prev) => prev.map((p) => p.id === renameModal.id ? { ...p, name: renameValue.trim() } : p));
      setRenameModal(null);
    }
  }

  async function handleDelete() {
    if (!deleteModal) return;
    const { error } = await supabase.from("pdfs").delete().eq("id", deleteModal.id);
    if (error) {
      toast.error("Delete failed", error.message);
    } else {
      toast.success("Deleted successfully");
      setPdfs((prev) => prev.filter((p) => p.id !== deleteModal.id));
      setDeleteModal(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Study Library</h1>
          <p className="text-muted-foreground mt-1">{pdfs.length} {pdfs.length === 1 ? "document" : "documents"} in your library</p>
        </div>
        <Button onClick={() => navigate("/upload")} variant="gradient">
          <Upload className="w-4 h-4" /> Upload New PDF
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your PDFs..."
          className="pl-10"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4 mt-4" />
              <Skeleton className="h-3 w-1/2 mt-2" />
              <Skeleton className="h-2 w-full mt-4" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search ? "No results found" : "No study materials yet"}
          description={search ? "Try a different search term" : "Upload your first PDF to start learning with AI"}
          action={
            !search && (
              <Button onClick={() => navigate("/upload")} variant="gradient">
                <Upload className="w-4 h-4" /> Upload PDF
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((pdf, i) => (
            <motion.div
              key={pdf.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -4 }}
            >
              <Card className="p-5 hover:shadow-xl hover:border-primary/30 transition-all group">
                {/* Thumbnail */}
                <div
                  onClick={() => navigate(`/workspace/${pdf.id}`)}
                  className="relative h-32 rounded-lg bg-gradient-to-br from-primary-500/10 to-accent/10 flex items-center justify-center cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-grid opacity-10" />
                  <FileText className="w-12 h-12 text-primary/40 group-hover:scale-110 transition-transform" />
                  {pdf.status === "processing" && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="mt-4 cursor-pointer" onClick={() => navigate(`/workspace/${pdf.id}`)}>
                  <p className="font-medium truncate group-hover:text-primary transition-colors">{pdf.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(pdf.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatReadingTime(pdf.reading_time)}
                    </span>
                  </div>
                </div>

                {/* Topics */}
                {pdf.topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {pdf.topics.slice(0, 3).map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        {t}
                      </span>
                    ))}
                    {pdf.topics.length > 3 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        +{pdf.topics.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Progress */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{pdf.progress}%</span>
                  </div>
                  <ProgressBar value={pdf.progress} />
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/workspace/${pdf.id}`)}
                    className="flex-1 mr-2"
                  >
                    <BookOpen className="w-4 h-4" /> Open
                  </Button>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === pdf.id ? null : pdf.id)}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {menuOpen === pdf.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden"
                          >
                            <button
                              onClick={() => { setRenameModal(pdf); setRenameValue(pdf.name); setMenuOpen(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors"
                            >
                              <Pencil className="w-4 h-4" /> Rename
                            </button>
                            <button
                              onClick={() => navigate(`/workspace/${pdf.id}`)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" /> Open
                            </button>
                            <button
                              onClick={() => { setDeleteModal(pdf); setMenuOpen(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Rename Modal */}
      <Modal
        open={!!renameModal}
        onClose={() => setRenameModal(null)}
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
            <Button variant="outline" onClick={() => setRenameModal(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleRename} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete PDF"
        description="This action cannot be undone. All chats, summaries, and PYQ analyses related to this PDF will also be deleted."
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10">
            <FileText className="w-5 h-5 text-destructive" />
            <span className="text-sm font-medium">{deleteModal?.name}</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDeleteModal(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="flex-1">
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
