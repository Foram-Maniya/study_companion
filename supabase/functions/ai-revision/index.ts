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

    const { pdfId, pdfContent } = await req.json();
    const context = pdfContent ? pdfContent.slice(0, 8000) : "";

    const prompt = `Create last-minute revision notes from the following study material. Focus on the most important concepts, formulas, and key points that a student should review before an exam.

Format your response as JSON:
{
  "notes": "Concise revision notes",
  "keyFormulas": ["formula 1", "formula 2", ...],
  "importantDates": ["important point 1", ...]
}

Study material:
${context}`;

    let result = { notes: "", keyFormulas: [] as string[], importantDates: [] as string[] };

    if (GEMINI_API_KEY) {
      const geminiRes = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 2048, responseMimeType: "application/json" },
        }),
      });

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        try {
          result = JSON.parse(text);
        } catch {
          result = generateFallbackRevision(context);
        }
      } else {
        result = generateFallbackRevision(context);
      }
    } else {
      result = generateFallbackRevision(context);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateFallbackRevision(context: string) {
  const sentences = context.split(/[.!?]+/).filter((s) => s.trim().length > 15);
  return {
    notes: sentences.slice(0, 8).join(". "),
    keyFormulas: ["Review key formulas from your material"],
    importantDates: ["Review important points from your material"],
  };
}
