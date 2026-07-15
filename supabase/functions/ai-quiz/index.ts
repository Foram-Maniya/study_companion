import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pdfId, type, pdfContent } = await req.json();
    const context = pdfContent ? pdfContent.slice(0, 8000) : "";

    const typeInstructions: Record<string, string> = {
      mcq: "Generate 5 multiple choice questions. Each question should have 4 options (A, B, C, D) with one correct answer. Include a brief explanation.",
      true_false: "Generate 5 true/false questions based on the content. Include a brief explanation for each.",
      short_answer: "Generate 5 short answer questions that test understanding of key concepts. Include model answers.",
    };

    const prompt = `Based on the following study material, ${typeInstructions[type] || typeInstructions.mcq}

Format your response as JSON:
{
  "questions": [
    {
      "type": "${type}",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "correct option",
      "explanation": "why this is correct"
    }
  ]
}

Study material:
${context}`;

    let questions: any[] = [];

    if (GEMINI_API_KEY) {
      const geminiRes = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048, responseMimeType: "application/json" },
        }),
      });

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        try {
          const parsed = JSON.parse(text);
          questions = parsed.questions || [];
        } catch {
          questions = generateFallbackQuiz(context, type);
        }
      } else {
        questions = generateFallbackQuiz(context, type);
      }
    } else {
      questions = generateFallbackQuiz(context, type);
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateFallbackQuiz(context: string, type: string): any[] {
  const sentences = context.split(/[.!?]+/).filter((s) => s.trim().length > 30).slice(0, 5);
  return sentences.map((s, i) => {
    if (type === "true_false") {
      return { type: "true_false", question: s.trim(), answer: i % 2 === 0 ? "True" : "False", explanation: "Based on the study material." };
    }
    if (type === "short_answer") {
      return { type: "short_answer", question: `Explain: ${s.trim().slice(0, 80)}...`, answer: s.trim() };
    }
    return { type: "mcq", question: s.trim().slice(0, 100), options: ["A", "B", "C", "D"], answer: "A", explanation: "Based on the study material." };
  });
}
