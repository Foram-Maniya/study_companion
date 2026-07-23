import { supabase } from "@/lib/supabase";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  answer: string;
  sources: { page: number; text: string }[];
  confidence: number;
  sourceType: "document" | "general";
}

interface QuizResponse {
  questions: {
    type: "mcq" | "true_false" | "short_answer";
    question: string;
    options?: string[];
    answer: string;
    explanation?: string;
  }[];
}

interface SummaryResponse {
  summary: string;
  keyPoints: string[];
}

interface RevisionResponse {
  chapterName?: string;
  definitions?: { term: string; definition: string }[];
  keyFormulas?: string[];
  flowchart?: string;
  comparisonTable?: { headers: string[]; rows: string[][] };
  examTips?: string[];
  faqs?: { q: string; a: string }[];
  memoryTricks?: string[];
  keywords?: string[];
  expectedQuestions?: string[];
  vivaQuestions?: string[];
  pyqConnections?: { year: string; question: string; marks: number }[];
  notes?: string;
  importantDates?: string[];
}

interface PyqResponse {
  questions: any[];
  frequency: { topic: string; count: number; avgMarks?: number; priority?: string }[];
  trends: { year: string; topics: string[] }[];
  importantChapters: string[];
  duplicates: { question: string; count: number }[];
}

async function callEdgeFunction(name: string, body: Record<string, unknown>) {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${FUNCTION_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`EDGE FUNCTION [${name}] ERROR:`, text);
    throw new Error(text);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

export const aiService = {
  async askQuestion(
    pdfId: string,
    question: string,
    history: ChatMessage[],
    pdfContent: string
  ): Promise<ChatResponse> {
    const res = await callEdgeFunction("ai-chat", {
      pdfId,
      question,
      pdfContent,
    });
    return {
      answer: res.answer,
      sources: res.sources || [],
      confidence: res.confidence || 0.7,
      sourceType: res.sourceType || (res.sources && res.sources.length > 0 ? "document" : "general"),
    };
  },

  async generateQuiz(pdfId: string, type: string, pdfContent: string): Promise<QuizResponse> {
    const res = await callEdgeFunction("ai-quiz", { pdfId, type, pdfContent });
    return { questions: res.questions || [] };
  },

  async generateSummary(pdfId: string, pdfContent: string): Promise<SummaryResponse> {
    const res = await callEdgeFunction("ai-summary", { pdfId, pdfContent });
    return { summary: res.summary || "", keyPoints: res.keyPoints || [] };
  },

  async generateRevision(pdfId: string, pdfContent: string): Promise<RevisionResponse> {
    const res = await callEdgeFunction("ai-revision", { pdfId, pdfContent });
    return {
      chapterName: res.chapterName,
      definitions: res.definitions || [],
      keyFormulas: res.keyFormulas || [],
      flowchart: res.flowchart || "",
      comparisonTable: res.comparisonTable,
      examTips: res.examTips || [],
      faqs: res.faqs || [],
      memoryTricks: res.memoryTricks || [],
      keywords: res.keywords || [],
      expectedQuestions: res.expectedQuestions || [],
      vivaQuestions: res.vivaQuestions || [],
      pyqConnections: res.pyqConnections || [],
      notes: res.notes || "",
      importantDates: res.importantDates || [],
    };
  },

  async generateFlashcards(pdfId: string, pdfContent: string) {
    const res = await callEdgeFunction("ai-quiz", { pdfId, type: "flashcards", pdfContent });
    return res.cards || res.questions || [];
  },

  async generateEssayQuestions(pdfId: string, markType: "short" | "long", pdfContent: string) {
    const res = await callEdgeFunction("ai-quiz", { pdfId, type: markType, pdfContent });
    return res.questions || [];
  },

  async evaluateVivaAnswer(question: string, answer: string, pdfContent: string) {
    const res = await callEdgeFunction("ai-chat", {
      question: `Evaluate my viva answer for: "${question}". My answer was: "${answer}". Give score out of 10 and constructive feedback.`,
      pdfContent,
    });
    return res.answer;
  },

  async analyzePyq(
    pdfId: string,
    pyqContent: string,
    studyContent: string
  ): Promise<PyqResponse> {
    const res = await callEdgeFunction("ai-pyq", { pdfId, pyqContent, studyContent });
    return {
      questions: res.questions || [],
      frequency: res.frequency || [],
      trends: res.trends || [],
      importantChapters: res.importantChapters || [],
      duplicates: res.duplicates || [],
    };
  },

  async generateAnswer(question: string, pdfContent: string, marks?: number): Promise<string> {
    const res = await callEdgeFunction("ai-answer", { question, pdfContent, marks });
    return res.answer;
  },
};
