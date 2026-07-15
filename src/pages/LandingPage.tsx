import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Brain,
  FileText,
  Sparkles,
  Upload,
  Search,
  GraduationCap,
  TrendingUp,
  Zap,
  CheckCircle2,
  ChevronDown,
  Menu,
  X,
  Moon,
  Sun,
  Quote,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Brain,
    title: "AI Study Assistant",
    description: "Chat with your PDFs. Ask questions, get explanations with real-life examples, chapter summaries, and key concept highlights.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: FileText,
    title: "PYQ Analyzer",
    description: "Upload previous year question papers. Get answer generation, frequency analysis, trend detection, and most repeated questions.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: GraduationCap,
    title: "Exam Preparation",
    description: "Generate quizzes with MCQs, true/false, and short answers. Use the doubt solver and last-minute revision mode.",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Zap,
    title: "RAG-Powered Answers",
    description: "Retrieval-Augmented Generation ensures answers prioritize your uploaded documents first, with source citations and confidence indicators.",
    color: "from-violet-500 to-purple-500",
  },
];

const steps = [
  { icon: Upload, title: "Upload PDF", description: "Drag & drop your study material. We process it instantly." },
  { icon: Brain, title: "AI Understands Notes", description: "Text extraction, chunking, and embeddings for smart retrieval." },
  { icon: BookOpen, title: "Learn", description: "Chat with AI to understand concepts like never before." },
  { icon: GraduationCap, title: "Prepare", description: "Generate quizzes, solve doubts, and revise efficiently." },
  { icon: FileText, title: "Analyze PYQs", description: "Upload past papers and discover patterns and trends." },
  { icon: CheckCircle2, title: "Ace Your Exams", description: "Walk in confident with AI-powered preparation." },
];

const benefits = [
  "Understand difficult concepts with AI explanations in simple language",
  "Identify important topics from previous year question patterns",
  "Save hours of manual study planning with AI-generated summaries",
  "Practice with auto-generated quizzes tailored to your material",
  "Get confidence-scored answers with source citations",
  "Everything on one screen — no switching between tools",
];

const testimonials = [
  { name: "Aarav Sharma", role: "B.Tech Student", text: "StudySphere AI completely changed how I prepare for exams. The PYQ analyzer found patterns I never noticed.", avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150" },
  { name: "Priya Patel", role: "Class 12 Student", text: "The AI study assistant explains concepts better than my textbooks. It's like having a personal tutor 24/7.", avatar: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150" },
  { name: "Rohan Verma", role: "GATE Aspirant", text: "The quiz generator and revision mode are game-changers. I went from anxious to confident in weeks.", avatar: "https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg?auto=compress&cs=tinysrgb&w=150" },
];

const faqs = [
  { q: "How does StudySphere AI work?", a: "Upload your study PDFs once. Our AI extracts text, chunks it, and generates embeddings for retrieval. When you ask questions, we use RAG (Retrieval-Augmented Generation) to find relevant content from your documents and send it to Gemini AI for accurate, sourced answers." },
  { q: "What is PYQ analysis?", a: "PYQ (Previous Year Questions) analysis lets you upload past exam papers. AI identifies question frequency, trends, most repeated questions, and important chapters — so you know exactly what to focus on." },
  { q: "Is my data secure?", a: "Yes. Your documents are stored securely with row-level security policies. Only you can access your uploaded materials and study data." },
  { q: "Can I use it on mobile?", a: "Absolutely. StudySphere AI is fully responsive and works beautifully on phones, tablets, and desktops." },
  { q: "What file formats are supported?", a: "Currently we support PDF files up to 10MB. More formats like DOCX and images are coming soon." },
];

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-full px-4 lg:px-6 flex items-center justify-between">
          <Logo size="md" />
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link to="/auth" className="hidden sm:block">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button variant="gradient" size="sm">Get Started <ArrowRight className="w-4 h-4" /></Button>
            </Link>
            <button onClick={() => setMobileMenu((p) => !p)} className="md:hidden p-2 rounded-lg hover:bg-secondary">
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="md:hidden border-t border-border bg-card"
          >
            <div className="p-4 space-y-2">
              <a href="#features" className="block py-2 text-sm font-medium">Features</a>
              <a href="#how-it-works" className="block py-2 text-sm font-medium">How It Works</a>
              <a href="#faq" className="block py-2 text-sm font-medium">FAQ</a>
              <Link to="/auth" className="block py-2 text-sm font-medium text-primary">Sign In</Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -z-0" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] -z-0" />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-6"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Powered by Gemini AI & RAG Technology</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-balance max-w-4xl mx-auto"
          >
            Learn Smarter.
            <br />
            Analyze PYQs.
            <br />
            <span className="gradient-text">Master Every Exam</span> with AI.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto text-balance"
          >
            Upload your study material once and let AI help you understand concepts, analyze previous year questions, generate quizzes and prepare for exams.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link to="/auth">
              <Button variant="gradient" size="lg">
                Upload Your First PDF <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg">Explore Features</Button>
            </a>
          </motion.div>

          {/* Hero visual mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 relative max-w-5xl mx-auto"
          >
            <div className="glass-card rounded-2xl p-2 shadow-2xl">
              <div className="rounded-xl overflow-hidden bg-card border border-border">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 text-center text-xs text-muted-foreground">StudySphere AI Workspace</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  <div className="p-6 border-r border-border">
                    <div className="flex items-center gap-2 mb-4">
                      <Brain className="w-5 h-5 text-primary" />
                      <span className="text-sm font-semibold">Study Assistant</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs">You</div>
                        <div className="flex-1 rounded-lg bg-secondary p-3 text-sm">Explain TCP vs UDP with examples</div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center text-xs text-white">AI</div>
                        <div className="flex-1 rounded-lg border border-border p-3 text-sm space-y-2">
                          <p>TCP is like a phone call — you confirm the other person is listening before speaking. UDP is like a radio broadcast — you send and hope it's received.</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-3 h-3 text-success" /> Source: Page 12, Computer Networks.pdf
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-secondary/30">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-accent" />
                      <span className="text-sm font-semibold">PYQ Analyzer</span>
                    </div>
                    <div className="space-y-2">
                      {["TCP vs UDP", "Routing Algorithms", "DNS Resolution", "OSI Model"].map((q, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-card p-2.5 text-sm border border-border">
                          <span>{q}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{4 - i}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything you need to ace exams</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">Powerful AI features designed specifically for students. Upload once, learn everything.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative rounded-2xl border border-border bg-card p-6 hover:shadow-xl transition-all duration-300"
              >
                <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4", f.color)}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-secondary/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">How it works</h2>
            <p className="mt-4 text-muted-foreground">From upload to exam day in six simple steps</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative rounded-2xl border border-border bg-card p-6"
              >
                <div className="absolute top-4 right-4 text-5xl font-bold text-primary/10">{i + 1}</div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 text-primary/30">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">Why students love StudySphere</h2>
              <div className="space-y-4">
                {benefits.map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">{b}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="glass-card rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Study Progress</p>
                    <p className="text-xs text-muted-foreground">Last 7 days</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Concepts Learned", value: 24, color: "bg-primary" },
                    { label: "Quizzes Taken", value: 12, color: "bg-accent" },
                    { label: "PYQs Analyzed", value: 8, color: "bg-success" },
                    { label: "Time Saved", value: 90, color: "bg-warning" },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{s.label}</span>
                        <span className="font-semibold">{s.value}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className={cn("h-full rounded-full", s.color)} style={{ width: `${s.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Loved by students</h2>
            <p className="mt-4 text-muted-foreground">Join thousands of students studying smarter</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <Quote className="w-8 h-8 text-primary/20 mb-4" />
                <p className="text-sm text-muted-foreground mb-6">{t.text}</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="max-w-3xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-medium">{faq.q}</span>
                  <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", openFaq === i && "rotate-180")} />
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: openFaq === i ? "auto" : 0, opacity: openFaq === i ? 1 : 0 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm text-muted-foreground">{faq.a}</p>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 lg:px-6">
          <div className="relative rounded-3xl gradient-bg p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-10" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to ace your next exam?</h2>
              <p className="text-white/80 mb-8 max-w-xl mx-auto">Upload your first PDF and experience AI-powered studying in minutes.</p>
              <Link to="/auth">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-xl">
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <Logo size="sm" />
              <p className="mt-4 text-sm text-muted-foreground max-w-xs">AI-powered study companion for school and college students. Learn smarter, not harder.</p>
            </div>
            <div>
              <p className="text-sm font-semibold mb-3">Product</p>
              <div className="space-y-2">
                <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
                <a href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
                <a href="#faq" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-3">Company</p>
              <div className="space-y-2">
                <a href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
                <a href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
                <a href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© 2026 StudySphere AI. All rights reserved.</p>
            <p className="text-sm text-muted-foreground">Powered by Gemini AI</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
