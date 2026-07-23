import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Strip ```json ... ``` fences some models add even when
// responseMimeType is set to application/json.
function cleanJsonText(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "")
    .trim();
}

// Retries only on 503 (server overloaded) — other errors like 429 quota
// exhaustion or 404 model-not-found won't be fixed by retrying.
async function fetchGeminiWithRetry(
  url: string,
  body: unknown,
  retries = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) return res;

    if (res.status === 503 && i < retries - 1) {
      console.warn(`Gemini overloaded (503), retrying in ${i + 1}s... (attempt ${i + 1})`);
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      continue;
    }

    return res;
  }
  throw new Error("Unreachable");
}

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

    const prompt = `Create a comprehensive chapter summary from the following study material.

Write in your own words — do not copy long raw passages verbatim.

Study material:
${context}`;

    // Forces Gemini to return data matching this exact shape, avoiding
    // malformed/truncated JSON from free-form "please output JSON" prompting.
    const responseSchema = {
      type: "OBJECT",
      properties: {
        summary: { type: "STRING" },
        keyPoints: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["summary", "keyPoints"],
    };

    let result = { summary: "", keyPoints: [] as string[] };
    let usedFallback = false;
    let fallbackReason = "";

    if (GEMINI_API_KEY) {
      const geminiRes = await fetchGeminiWithRetry(GEMINI_URL, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema,
        },
      });

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        try {
          result = JSON.parse(cleanJsonText(rawText));
        } catch (parseErr) {
          console.error("Summary JSON parse failed. Raw text was:", rawText);
          console.error("Parse error:", parseErr);
          usedFallback = true;
          fallbackReason = `JSON parse failed: ${String(parseErr)}`;
          result = generateFallbackSummary(context);
        }
      } else {
        const errBody = await geminiRes.text();
        console.error(`Gemini API error ${geminiRes.status}:`, errBody);
        usedFallback = true;
        fallbackReason = `Gemini API returned ${geminiRes.status}: ${errBody}`;
        result = generateFallbackSummary(context);
      }
    } else {
      usedFallback = true;
      fallbackReason = "GEMINI_API_KEY is not set";
      result = generateFallbackSummary(context);
    }

    return new Response(
      JSON.stringify({
        ...result,
        _debug: usedFallback ? { usedFallback, fallbackReason } : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Summary function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateFallbackSummary(context: string) {
  const sentences = context.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  return {
    summary: sentences.slice(0, 5).join(". ") || "Unable to generate summary.",
    keyPoints: sentences.slice(0, 5).map((s) => s.trim().slice(0, 80)),
  };
}