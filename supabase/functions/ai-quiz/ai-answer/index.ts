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

    const { question, pdfContent } = await req.json();
    const context = pdfContent ? pdfContent.slice(0, 8000) : "";

    const prompt = `Answer the following exam question based on the study material provided. Write a comprehensive, well-structured answer that a student would write in an exam.

Question: ${question}

Study material:
${context}`;

    let answer = "";

    if (GEMINI_API_KEY) {
      const geminiRes = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
        }),
      });

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate answer.";
      } else {
        answer = generateFallbackAnswer(question, context);
      }
    } else {
      answer = generateFallbackAnswer(question, context);
    }

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateFallbackAnswer(question: string, context: string): string {
  const sentences = context.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  const relevant = sentences.filter((s) =>
    question.toLowerCase().split(" ").some((word) => word.length > 3 && s.toLowerCase().includes(word))
  ).slice(0, 5);
  const excerpt = relevant.length > 0 ? relevant.join(". ") : sentences.slice(0, 5).join(". ");

  return `Answer:\n\n${excerpt}\n\nThis answer is based on the study material provided. The key points to include in your exam answer are:\n\n1. Define the core concept clearly\n2. Explain with relevant examples\n3. Discuss the practical applications\n4. Conclude with the significance\n\nNote: Expand on each point with details from your study material for a complete answer.`;
}
