import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { GoogleGenAI } from "npm:@google/genai@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function generateWithRetry(
  ai: GoogleGenAI,
  contents: string,
  primaryModel = "gemini-flash-latest",
  fallbackModel = "gemini-flash-lite-latest",
  retries = 3
) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent({
        model: primaryModel,
        contents,
      });
    } catch (e) {
      const msg = String(e);
      const isOverloaded = msg.includes("503") || msg.includes("UNAVAILABLE");

      if (isOverloaded && i < retries - 1) {
        console.warn(`Model overloaded, retrying in ${i + 1}s... (attempt ${i + 1})`);
        await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
        continue;
      }

      if (isOverloaded) {
        console.warn(`Primary model overloaded, trying fallback: ${fallbackModel}`);
        try {
          return await ai.models.generateContent({
            model: fallbackModel,
            contents,
          });
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
      throw e;
    }
  }
  throw new Error("Failed to generate content after retries");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY is not set. Run: supabase secrets set GEMINI_API_KEY=your_key"
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { pdfId, question, pdfContent } = await req.json();

    if (!question) {
      throw new Error("Missing question in request body");
    }

    let context = pdfContent || "";
    if (!context && pdfId) {
      const { data: pdf } = await supabase
        .from("pdfs")
        .select("content")
        .eq("id", pdfId)
        .single();
      if (pdf?.content) context = pdf.content;
    }

    context = context.substring(0, 30000);

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const prompt = `
You are StudySphere AI, a world-class AI tutor helping a student learn for university exams.

CRITICAL FORMATTING INSTRUCTIONS:
- NEVER return giant wall of plain paragraphs.
- ALWAYS use proper Markdown headings (##, ###).
- Use bullet points (- ) and numbered lists for steps or points.
- Use **bold** for key terms and concepts.
- Use markdown tables (| Col 1 | Col 2 |) when comparing items or organizing structured data.
- Include practical examples or code snippets where applicable.
- Make the answer look like professionally formatted university study notes.

STUDY MATERIAL CONTEXT:
${context}

STUDENT QUESTION:
${question}
`;

    const result = await generateWithRetry(ai, prompt);
    const answer = result.text;

    return new Response(
      JSON.stringify({
        answer,
        confidence: 0.95,
        sourceType: context ? "document" : "general",
        sources: [],
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (e) {
    console.error("AI chat edge function error:", e);
    return new Response(
      JSON.stringify({
        error: String(e instanceof Error ? e.message : e),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});