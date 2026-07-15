import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Upload,
  BookOpen,
  Brain,
  TrendingUp,
  Clock,
  FileText,
  ArrowRight,
  Sparkles,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar, Skeleton } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { getGreeting, formatRelativeTime, formatReadingTime, cn } from "@/lib/utils";

interface PdfItem {
  id: string;
  name: string;
  progress: number;
  reading_time: number;
  page_count: number;
  created_at: string;
  topics: string[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, studied: 0, summaries: 0, pyqs: 0 });

  const fullName = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "Student";

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from("pdfs")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        setPdfs(data);
        const { count: summaryCount } = await supabase
          .from("summaries")
          .select("*", { count: "exact", head: true });
        const { count: pyqCount } = await supabase
          .from("pyq_analyses")
          .select("*", { count: "exact", head: true });
        setStats({
          total: data.length,
          studied: data.filter((p) => p.progress > 0).length,
          summaries: summaryCount ?? 0,
          pyqs: pyqCount ?? 0,
        });
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const statCards = [
    { label: "Study Materials", value: stats.total, icon: FileText, color: "from-blue-500 to-cyan-500" },
    { label: "In Progress", value: stats.studied, icon: BookOpen, color: "from-emerald-500 to-teal-500" },
    { label: "Summaries", value: stats.summaries, icon: Sparkles, color: "from-orange-500 to-amber-500" },
    { label: "PYQs Analyzed", value: stats.pyqs, icon: TrendingUp, color: "from-violet-500 to-purple-500" },
  ];

  const continueStudying = pdfs.filter((p) => p.progress > 0 && p.progress < 100).slice(0, 3);
  const recentPdfs = pdfs.slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Greeting Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl gradient-bg p-8 overflow-hidden"
      >
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <p className="text-white/80 text-sm font-medium">{getGreeting()},</p>
          <h1 className="text-3xl font-bold text-white mt-1">{fullName} 👋</h1>
          <p className="text-white/70 mt-2 max-w-lg">
            Ready to learn? Pick up where you left off or upload a new study material to get started.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => navigate("/upload")}
              className="bg-white text-primary hover:bg-white/90 shadow-lg"
            >
              <Upload className="w-4 h-4" /> Upload New PDF
            </Button>
            <Button
              onClick={() => navigate("/library")}
              className="bg-white/10 text-white hover:bg-white/20 border border-white/20"
            >
              <BookOpen className="w-4 h-4" /> Study Library
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  {loading ? (
                    <Skeleton className="h-8 w-12 mt-2" />
                  ) : (
                    <p className="text-3xl font-bold mt-1">{s.value}</p>
                  )}
                </div>
                <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center", s.color)}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Continue Studying */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Continue Studying</h2>
          <Link to="/library" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-4 w-3/4 mt-4" />
                <Skeleton className="h-3 w-1/2 mt-2" />
              </Card>
            ))}
          </div>
        ) : continueStudying.length === 0 ? (
          <Card className="p-8 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No materials in progress yet</p>
            <p className="text-sm text-muted-foreground mt-1">Upload a PDF and start learning to see it here</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {continueStudying.map((pdf, i) => (
              <motion.div
                key={pdf.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/workspace/${pdf.id}`)}
                className="cursor-pointer"
              >
                <Card className="p-5 hover:shadow-lg hover:border-primary/30 transition-all group">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-14 rounded-lg bg-gradient-to-br from-primary-500 to-accent flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate group-hover:text-primary transition-colors">{pdf.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{pdf.page_count} pages · {formatReadingTime(pdf.reading_time)}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{pdf.progress}%</span>
                    </div>
                    <ProgressBar value={pdf.progress} />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Study Library Preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Study Library</h2>
          <Link to="/library" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <Skeleton className="h-4 w-3/4 mt-4" />
                <Skeleton className="h-3 w-1/2 mt-2" />
              </Card>
            ))}
          </div>
        ) : recentPdfs.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-medium">No study materials yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Upload your first PDF to get started</p>
            <Button onClick={() => navigate("/upload")} variant="gradient">
              <Upload className="w-4 h-4" /> Upload PDF
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentPdfs.map((pdf, i) => (
              <motion.div
                key={pdf.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/workspace/${pdf.id}`)}
                className="cursor-pointer"
              >
                <Card className="p-5 hover:shadow-lg hover:border-primary/30 transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-accent flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{pdf.name}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(pdf.created_at)}</p>
                    </div>
                  </div>
                  {pdf.topics?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {pdf.topics.slice(0, 3).map((t) => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Brain, title: "Ask AI", desc: "Get instant explanations", path: "/library", color: "from-blue-500 to-cyan-500" },
          { icon: GraduationCap, title: "Take a Quiz", desc: "Test your knowledge", path: "/library", color: "from-emerald-500 to-teal-500" },
          { icon: TrendingUp, title: "Analyze PYQs", desc: "Find exam patterns", path: "/library", color: "from-violet-500 to-purple-500" },
        ].map((a, i) => (
          <motion.div
            key={a.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(a.path)}
            className="cursor-pointer"
          >
            <Card className="p-5 hover:shadow-lg transition-all group flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", a.color)}>
                <a.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium group-hover:text-primary transition-colors">{a.title}</p>
                <p className="text-sm text-muted-foreground">{a.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
