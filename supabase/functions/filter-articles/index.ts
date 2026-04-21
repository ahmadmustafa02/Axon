import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL =
  Deno.env.get("AI_GATEWAY_URL") ??
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const FILTER_BATCH_SIZE = 5;

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
    snippet: (a.raw_text ?? "").slice(0, 300),
    source: a.source,
    topic: a.topic_name,
  }));

  const systemPrompt =
    `You are an expert news curator. Score each article 0-100 for relevance to the user's interests and assign a velocity tag.\n` +
    `User interests: ${userTopics.join(", ")}.\n` +
    `Velocity: "rising" (gaining attention), "steady" (ongoing topic), "noise" (low signal).\n\n` +
    `You MUST respond with ONLY a valid JSON object, no markdown, no explanation, no code blocks.\n` +
    `Format: {"scores": [{"idx": 0, "relevance": 85, "velocity": "rising", "summary": "one sentence why this matters"}, ...]}\n` +
    `Include every article by its idx number.`;

  const body = {
    model: Deno.env.get("AI_GATEWAY_MODEL") ?? "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Score these ${articles.length} articles and return JSON only:\n${JSON.stringify(items, null, 2)}`,
      },
    ],
    temperature: 0,
  };

  const res = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limited — wait 1 minute and try again.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI gateway ${res.status}: ${text}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "";

  console.log("AI raw response:", content.slice(0, 500));

  // Strip markdown code fences if present
  const cleaned = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // Try to extract JSON object from response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`Could not parse AI response: ${content.slice(0, 200)}`);
    parsed = JSON.parse(match[0]);
  }

  return parsed.scores as Array<{
    idx: number;
    relevance: number;
    velocity: string;
    summary: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

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
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
        Deno.env.get("SUPABASE_ANON_KEY")!,
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

    const { data: topics } = await admin
      .from("topics")
      .select("name")
      .eq("user_id", userId);
    const topicNames = (topics ?? []).map((t: any) => t.name);

    console.log(`User ${userId} has topics:`, topicNames);

    const { data: rows, error } = await admin
      .from("articles")
      .select("id, title, raw_text, source, topic_id, topics(name)")
      .eq("user_id", userId)
      .is("relevance_score", null)
      .order("fetched_at", { ascending: false })
      .limit(FILTER_BATCH_SIZE);

    if (error) throw error;

    console.log(`Found ${rows?.length ?? 0} unscored articles`);

    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ scored: 0, remaining: 0 }), {
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

    const scores = await scoreBatch(articles, topicNames);
    console.log(`Got ${scores.length} scores back from AI`);

    const VALID_VELOCITIES = ["rising", "steady", "noise"];

    let updated = 0;
    for (const s of scores) {
      const a = articles[s.idx];
      if (!a) continue;

      // Sanitize velocity — default to "steady" if AI returns invalid value
      const velocity = VALID_VELOCITIES.includes(s.velocity) ? s.velocity : "steady";

      const { error: upErr } = await admin
        .from("articles")
        .update({
          relevance_score: s.relevance,
          velocity: velocity,
          summary: s.summary,
        })
        .eq("id", a.id);

      if (upErr) {
        console.error(`Failed to update article ${a.id}:`, upErr.message);
      } else {
        updated++;
      }
    }
    const { count } = await admin
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("relevance_score", null);

    console.log(`Updated ${updated} articles, ${count} remaining`);

    return new Response(
      JSON.stringify({ scored: updated, remaining: count ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("filter-articles error", e);
    const msg = e instanceof Error ? e.message : "Unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});