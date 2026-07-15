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
  notes: string;
  keyFormulas: string[];
  importantDates: string[];
}

interface PyqResponse {
  questions: string[];
  frequency: { topic: string; count: number }[];
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
    const errorBody = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(errorBody.error || `Request failed (${response.status})`);
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
      question
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
      notes: res.notes || "",
      keyFormulas: res.keyFormulas || [],
      importantDates: res.importantDates || [],
    };
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

  async generateAnswer(question: string, pdfContent: string): Promise<string> {
    const res = await callEdgeFunction("ai-answer", { question, pdfContent });
    return res.answer;
  },
};
