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

const extractionSchema = {
  type: "OBJECT",
  properties: {
    text: { type: "STRING" },
    pageCount: { type: "NUMBER" },
    topics: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["text", "pageCount", "topics"],
};

const topicsSchema = {
  type: "ARRAY",
  items: { type: "STRING" },
};

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

    const {
      pdfId,
      fileContent,
      extractedText: frontendText,
      pageCount: frontendPageCount,
    } = await req.json();

    if (!fileContent) {
      return new Response(JSON.stringify({ error: "No file content provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfBytes = Uint8Array.from(atob(fileContent), (c) => c.charCodeAt(0));

    let extractedText = frontendText || "";
    let pageCount = frontendPageCount || 1;
    let topics: string[] = [];
    let debugNotes: string[] = [];

    if (GEMINI_API_KEY && extractedText.length < 100) {
      const geminiRes = await fetchGeminiWithRetry(GEMINI_URL, {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: fileContent,
                },
              },
              {
                text: `Analyze this PDF document. Extract ALL the text content from every page. Then identify the main topics covered.

Extract as much text as possible. If the PDF is scanned images, describe what you see.
Estimate the page count as a number.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: extractionSchema,
        },
      });

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        try {
          const parsed = JSON.parse(cleanJsonText(responseText));
          extractedText = parsed.text || "";
          pageCount = parsed.pageCount || Math.max(1, Math.round(pdfBytes.length / 50000));
          topics = parsed.topics || [];
        } catch (parseErr) {
          console.error("PDF extraction JSON parse failed. Raw text was:", responseText);
          console.error("Parse error:", parseErr);
          debugNotes.push(`Extraction JSON parse failed: ${String(parseErr)}`);
          extractedText = responseText;
          pageCount = Math.max(1, Math.round(pdfBytes.length / 50000));
        }
      } else {
        const errBody = await geminiRes.text();
        console.error(`Gemini PDF extraction error ${geminiRes.status}:`, errBody);
        debugNotes.push(`Gemini extraction returned ${geminiRes.status}: ${errBody}`);
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      extractedText = "No text could be extracted from this PDF.";
    }

    if (pageCount <= 0) {
      pageCount = 1;
    }

    if (topics.length === 0) {
      topics = ["General Topics"];
    }

    if (GEMINI_API_KEY && extractedText.length > 100 && topics[0] === "General Topics") {
      try {
        const topicRes = await fetchGeminiWithRetry(GEMINI_URL, {
          contents: [
            {
              parts: [
                {
                  text:
                    `Identify 3-6 main study topics from the following text. Return only short topic names.\n\n` +
                    extractedText.slice(0, 20000),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
            responseSchema: topicsSchema,
          },
        });

        if (topicRes.ok) {
          const json = await topicRes.json();
          const response = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
          try {
            const parsedTopics = JSON.parse(cleanJsonText(response));
            if (Array.isArray(parsedTopics) && parsedTopics.length > 0) {
              topics = parsedTopics;
            }
          } catch (parseErr) {
            console.error("Topic JSON parse failed. Raw text was:", response);
            debugNotes.push(`Topic JSON parse failed: ${String(parseErr)}`);
          }
        } else {
          const errBody = await topicRes.text();
          console.error(`Gemini topic extraction error ${topicRes.status}:`, errBody);
          debugNotes.push(`Gemini topic call returned ${topicRes.status}: ${errBody}`);
        }
      } catch (e) {
        console.error("Topic extraction threw:", e);
        debugNotes.push(`Topic extraction threw: ${String(e)}`);
      }
    }

    if (pdfId) {
      const { error: updateError } = await supabase
        .from("pdfs")
        .update({
          content: extractedText,
          page_count: pageCount,
          topics: topics.length > 0 ? topics : ["General Topics"],
          status: "ready",
        })
        .eq("id", pdfId);

      if (updateError) {
        console.error("Failed to update pdfs row:", updateError);
        debugNotes.push(`DB update failed: ${updateError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        text: extractedText,
        pageCount,
        topics: topics.length > 0 ? topics : ["General Topics"],
        _debug: debugNotes.length > 0 ? debugNotes : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-pdf function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});