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

    const { pdfId, question } = await req.json();

const { data: pdf, error: pdfError } = await supabase
  .from("pdfs")
  .select("content")
  .eq("id", pdfId)
  .single();

if (pdfError || !pdf) {
  throw new Error("Unable to load PDF content.");
}

const context = (pdf.content || "").slice(0, 30000);

    const systemPrompt = `
You are StudySphere AI, an expert AI tutor.

The text below comes from the student's uploaded PDF.

Your job is NOT to copy the PDF.

Instead:

• Read the PDF carefully.
• Answer ONLY the user's question.
• Explain in simple language.
• Use headings.
• Use bullet points.
• Give examples whenever possible.
• Do NOT repeat the entire document.
• Do NOT start your answer by quoting the PDF.
• If the PDF contains the answer, explain it naturally.
• If the PDF does not contain enough information, clearly say so and then use your own knowledge to help the student.

---------------------------------

DOCUMENT

${context}

---------------------------------

QUESTION

${question}

Return only the answer.
`;

    let answer = "";
    let sources: { page: number; text: string }[] = [];
    let confidence = 0.7;

    if (GEMINI_API_KEY) {
      const geminiRes = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: systemPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
          },
        }),
      });
    
      if (!geminiRes.ok) {
        const errorText = await geminiRes.text();
        throw new Error(`Gemini Error ${geminiRes.status}: ${errorText}`);
      }
    
      const geminiData = await geminiRes.json();
    
      answer =
        geminiData.candidates?.[0]?.content?.parts?.[0]?.text ??
        "No response returned from Gemini.";
    
      confidence = context ? 0.95 : 0.6;
    
      if (context) {
        const relevant = context
          .split(/[.!?]+/)
          .filter((s) => s.trim().length > 20)
          .slice(0, 3);
    
        sources = relevant.map((s, i) => ({
          page: i + 1,
          text: s.trim(),
        }));
      }
    } else {
      answer = generateFallbackAnswer();
    }

    const sourceType = sources.length > 0 ? "document" : "general";

    return new Response(JSON.stringify({ answer, sources, confidence, sourceType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
  
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
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

function generateFallbackAnswer() {
  return "THIS IS THE FALLBACK";
}
