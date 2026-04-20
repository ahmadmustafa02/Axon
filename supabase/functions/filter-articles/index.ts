// Score unrated articles (relevance + velocity) using the AI gateway (Gemini Flash)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL =
  Deno.env.get("AI_GATEWAY_URL") ??
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const FILTER_BATCH_SIZE = 10;

interface ArticleRow {
  id: string;
  title: string;
  raw_text: string | null;
  source: string;
  topic_name: string | null;
}

async function scoreBatch(articles: ArticleRow[], userTopics: string[]) {
  const apiKey = Deno.env.get("AI_GATEWAY_API_KEY");
  if (!apiKey) throw new Error("AI_GATEWAY_API_KEY not configured");

  const items = articles.map((a, i) => ({
    idx: i,
    title: a.title,
    snippet: (a.raw_text ?? "").slice(0, 400),
    source: a.source,
    topic: a.topic_name,
  }));

  const systemPrompt =
    `You are an expert news curator for a personal briefing. Score each article 0-100 for relevance to the user's interests and assign a velocity tag.\n` +
    `User interests: ${userTopics.join(", ")}.\n` +
    `Velocity: "rising" (gaining attention), "steady" (ongoing topic), "noise" (low signal).`;

  const body = {
    model: Deno.env.get("AI_GATEWAY_MODEL") ?? "gemini-2.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Score these articles:\n${JSON.stringify(items, null, 2)}` },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "submit_scores",
          description: "Return a relevance score and velocity for each article.",
          parameters: {
            type: "object",
            properties: {
              scores: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    idx: { type: "number" },
                    relevance: { type: "number", minimum: 0, maximum: 100 },
                    velocity: { type: "string", enum: ["rising", "steady", "noise"] },
                    summary: { type: "string", description: "One sentence (~25 words) explaining why this matters." },
                  },
                  required: ["idx", "relevance", "velocity", "summary"],
                  additionalProperties: false,
                },
              },
            },
            required: ["scores"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "submit_scores" } },
  };

  const res = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limited — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    throw new Error(`AI gateway ${res.status}: ${text}`);
  }

  const json = await res.json();
  const call = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("No tool call in response");
  const args = JSON.parse(call.function.arguments);
  return args.scores as Array<{ idx: number; relevance: number; velocity: string; summary: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Get user topics for context
    const { data: topics } = await admin.from("topics").select("name").eq("user_id", userId);
    const topicNames = (topics ?? []).map((t: any) => t.name);

    // Get unrated articles, with topic name
    const { data: rows, error } = await admin
      .from("articles")
      .select("id, title, raw_text, source, topic_id, topics(name)")
      .eq("user_id", userId)
      .is("relevance_score", null)
      .order("fetched_at", { ascending: false })
      .limit(40);

    if (error) throw error;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ scored: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const articles: ArticleRow[] = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      raw_text: r.raw_text,
      source: r.source,
      topic_name: r.topics?.name ?? null,
    }));

    let updated = 0;
    for (let offset = 0; offset < articles.length; offset += FILTER_BATCH_SIZE) {
      if (offset > 0) {
        await new Promise(r => setTimeout(r, 15000));
      }
      const batch = articles.slice(offset, offset + FILTER_BATCH_SIZE);
      const scores = await scoreBatch(batch, topicNames);

      for (const s of scores) {
        const a = batch[s.idx];
        if (!a) continue;
        const { error: upErr } = await admin
          .from("articles")
          .update({
            relevance_score: s.relevance,
            velocity: s.velocity,
            summary: s.summary,
          })
          .eq("id", a.id);
        if (!upErr) updated++;
      }
    }

    return new Response(JSON.stringify({ scored: updated, total: articles.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("filter-articles error", e);
    const msg = e instanceof Error ? e.message : "Unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
