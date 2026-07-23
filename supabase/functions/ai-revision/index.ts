import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

function cleanJsonText(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "")
    .trim();
}

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
      console.warn(`Gemini overloaded (503), retrying in ${i + 1}s...`);
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
    const context = pdfContent ? pdfContent.slice(0, 12000) : "";

    const prompt = `Generate a 5-minute Quick Revision Sheet for university exam preparation from the following study material.

Include:
1. Chapter/Main Subject Name
2. Key Definitions (term + definition)
3. Key Formulas & Equations
4. Flowchart / Mind Map in Mermaid syntax (e.g. graph TD\\n A[Start] --> B[Process])
5. Comparison Table (headers + rows comparing key concepts)
6. Pro Exam Tips
7. Frequently Asked Questions (Q&A)
8. Expected Viva Questions
9. Memory Tricks & Mnemonics

Study material:
${context}`;

    const responseSchema = {
      type: "OBJECT",
      properties: {
        chapterName: { type: "STRING" },
        definitions: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              term: { type: "STRING" },
              definition: { type: "STRING" },
            },
          },
        },
        keyFormulas: { type: "ARRAY", items: { type: "STRING" } },
        flowchart: { type: "STRING" },
        comparisonTable: {
          type: "OBJECT",
          properties: {
            headers: { type: "ARRAY", items: { type: "STRING" } },
            rows: {
              type: "ARRAY",
              items: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
            },
          },
        },
        examTips: { type: "ARRAY", items: { type: "STRING" } },
        faqs: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              q: { type: "STRING" },
              a: { type: "STRING" },
            },
          },
        },
        vivaQuestions: { type: "ARRAY", items: { type: "STRING" } },
        memoryTricks: { type: "ARRAY", items: { type: "STRING" } },
        keywords: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["chapterName", "definitions", "keyFormulas", "examTips"],
    };

    let result = {};

    if (GEMINI_API_KEY) {
      const geminiRes = await fetchGeminiWithRetry(GEMINI_URL, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
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
          console.error("Revision parse error:", parseErr);
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
    console.error("Revision function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateFallbackRevision(context: string) {
  return {
    chapterName: "Revision Summary",
    definitions: [{ term: "Key Topic", definition: "Primary concept from study material" }],
    keyFormulas: ["Review formulas from material"],
    flowchart: "graph TD\n  A[Study Material] --> B[Key Concepts]\n  B --> C[Exam Prep]",
    examTips: ["Focus on high-frequency questions", "Practice drawing clear diagrams"],
    vivaQuestions: ["What is the main algorithm described?", "What are its limitations?"],
  };
}