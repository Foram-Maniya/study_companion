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

    const pdfBytes = Uint8Array.from(atob(fileContent), (c) =>
      c.charCodeAt(0)
    );
    
    let extractedText = frontendText || "";
    let pageCount = frontendPageCount || 1;
    let topics: string[] = [];;

    if (GEMINI_API_KEY && extractedText.length < 100)  {
      // Send PDF directly to Gemini for text extraction and topic detection
      const geminiRes = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: fileContent, // base64 encoded
                  },
                },
                {
                  text: `Analyze this PDF document. Extract ALL the text content from every page. Then identify the main topics covered.

Format your response as JSON:
{
  "text": "All extracted text from the document, preserving structure and paragraphs",
  "pageCount": <estimated number of pages>,
  "topics": ["topic1", "topic2", ...]
}

Extract as much text as possible. If the PDF is scanned images, describe what you see.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      });

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        try {
          const parsed = JSON.parse(responseText);
          extractedText = parsed.text || "";
          pageCount = parsed.pageCount || Math.max(1, Math.round(pdfBytes.length / 50000));
          topics = parsed.topics || [];
        } catch {
          // If JSON parse fails, use raw text
          extractedText = responseText;
          pageCount = Math.max(1, Math.round(pdfBytes.length / 50000));
        }
      }
    }

    // Fallback: if Gemini didn't produce text, use a basic estimate
    if (!extractedText || extractedText.trim().length === 0) {
      extractedText = "No text could be extracted from this PDF.";
    }
    
    if (pageCount <= 0) {
      pageCount = 1;
    }
    
    if (topics.length === 0) {
      topics = ["General Topics"];
    }

    if (GEMINI_API_KEY && extractedText.length > 100 && topics.length === 0) {
      try {
        const topicRes = await fetch(GEMINI_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text:
                      `Identify the main study topics from the following text. Return ONLY a JSON array.\n\n` +
                      extractedText.slice(0, 20000),
                  },
                ],
              },
            ],
          }),
        });
    
        if (topicRes.ok) {
          const json = await topicRes.json();
          const response =
            json.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
          try {
            topics = JSON.parse(response);
          } catch {
            topics = ["Study Material"];
          }
        }
      } catch (_) {
        topics = ["Study Material"];
      }
    }

    // Update the PDF record with extracted content
    if (pdfId) {
      await supabase
        .from("pdfs")
        .update({
          content: extractedText,
          page_count: pageCount,
          topics: topics.length > 0 ? topics : ["General Topics"],
          status: "ready",
        })
        .eq("id", pdfId);
    }

    return new Response(
      JSON.stringify({
        text: extractedText,
        pageCount,
        topics: topics.length > 0 ? topics : ["General Topics"],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
