import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Strip ```json ... ``` or ``` ... ``` fences some models add even when
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
// exhaustion or 404 model-not-found won't be fixed by retrying, so we
// return those immediately for the caller to handle.
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

    const { pdfId, type, pdfContent } = await req.json();
    const context = pdfContent ? pdfContent.slice(0, 8000) : "";

    const typeInstructions: Record<string, string> = {
      mcq: "Generate 5 multiple choice questions. Each question should have 4 options (A, B, C, D) with one correct answer. Include a brief explanation.",
      true_false: "Generate 5 true/false questions based on the content. Include a brief explanation for each.",
      short_answer: "Generate 5 short answer questions that test understanding of key concepts. Include model answers.",
    };

    const prompt = `Based on the following study material, ${typeInstructions[type] || typeInstructions.mcq}

Keep each question and explanation concise (1-2 sentences). Do not copy long
raw passages from the study material verbatim — write original questions
that test understanding of the concepts instead.

Study material:
${context}`;

    // Forces Gemini to return data matching this exact shape, which avoids
    // the malformed/truncated JSON issues you get from free-form "please
    // output JSON" prompting.
    const responseSchema = {
      type: "OBJECT",
      properties: {
        questions: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              type: { type: "STRING" },
              question: { type: "STRING" },
              options: { type: "ARRAY", items: { type: "STRING" } },
              answer: { type: "STRING" },
              explanation: { type: "STRING" },
            },
            required: ["type", "question", "answer", "explanation"],
          },
        },
      },
      required: ["questions"],
    };

    let questions: any[] = [];
    let usedFallback = false;
    let fallbackReason = "";

    if (GEMINI_API_KEY) {
      const geminiRes = await fetchGeminiWithRetry(GEMINI_URL, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema,
        },
      });

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        try {
          const parsed = JSON.parse(cleanJsonText(rawText));
          questions = parsed.questions || [];
          if (questions.length === 0) {
            usedFallback = true;
            fallbackReason = "Gemini returned an empty questions array";
          }
        } catch (parseErr) {
          console.error("Quiz JSON parse failed. Raw text was:", rawText);
          console.error("Parse error:", parseErr);
          usedFallback = true;
          fallbackReason = `JSON parse failed: ${String(parseErr)}`;
        }
      } else {
        const errBody = await geminiRes.text();
        console.error(`Gemini API error ${geminiRes.status}:`, errBody);
        usedFallback = true;
        fallbackReason = `Gemini API returned ${geminiRes.status}: ${errBody}`;
      }
    } else {
      usedFallback = true;
      fallbackReason = "GEMINI_API_KEY is not set";
    }

    if (usedFallback) {
      console.error("Falling back to dummy quiz generator. Reason:", fallbackReason);
      questions = generateFallbackQuiz(context, type);
    }

    return new Response(
      JSON.stringify({
        questions,
        // Remove this field once you've confirmed things are working —
        // it's here temporarily so you can see fallback reasons in the
        // Network tab response without digging through logs.
        _debug: usedFallback ? { usedFallback, fallbackReason } : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Quiz function error:", err);
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