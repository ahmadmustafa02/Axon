// Assemble a daily briefing from top-scored articles using the AI gateway
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL =
  Deno.env.get("AI_GATEWAY_URL") ??
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

interface ArticleRow {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string | null;
  relevance_score: number | null;
  velocity: string | null;
  topic_name: string | null;
}

async function assemble(articles: ArticleRow[], userTopics: string[], displayName: string | null) {
  const apiKey = Deno.env.get("AI_GATEWAY_API_KEY");
  if (!apiKey) throw new Error("AI_GATEWAY_API_KEY not configured");

  const items = articles.map((a, i) => ({
    idx: i,
    id: a.id,
    title: a.title,
    source: a.source,
    summary: a.summary,
    relevance: a.relevance_score,
    velocity: a.velocity,
    topic: a.topic_name,
  }));

  const systemPrompt =
    `You are an expert daily briefing editor. Craft a concise, well-structured briefing for a busy reader.\n` +
    `Reader: ${displayName ?? "the reader"}.\n` +
    `Their interests: ${userTopics.join(", ")}.\n\n` +
    `Rules:\n` +
    `- Write a warm, intelligent 2-sentence intro framing today's signal.\n` +
    `- Pick 3-5 "top stories" — the highest-impact items.\n` +
    `- Pick 2-4 "rising trends" — items tagged "rising" or that suggest momentum.\n` +
    `- Use only article ids that appear in the input.\n` +
    `- Each story gets a sharp 1-sentence "why it matters" (max 25 words).\n` +
    `- Title should be punchy and dated-feeling, e.g. "Friday signal" or "AI ships, regulators react".`;

  const body = {
    model: Deno.env.get("AI_GATEWAY_MODEL") ?? "gemini-2.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Today's candidate articles:\n${JSON.stringify(items, null, 2)}` },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "submit_briefing",
          description: "Return the assembled briefing.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              intro: { type: "string", description: "2 sentences." },
              top_stories: {
                type: "array",
                minItems: 3,
                maxItems: 5,
                items: {
                  type: "object",
                  properties: {
                    article_id: { type: "string" },
                    headline: { type: "string" },
                    why: { type: "string" },
                  },
                  required: ["article_id", "headline", "why"],
                  additionalProperties: false,
                },
              },
              rising_trends: {
                type: "array",
                minItems: 0,
                maxItems: 4,
                items: {
                  type: "object",
                  properties: {
                    article_id: { type: "string" },
                    headline: { type: "string" },
                    why: { type: "string" },
                  },
                  required: ["article_id", "headline", "why"],
                  additionalProperties: false,
                },
              },
            },
            required: ["title", "intro", "top_stories", "rising_trends"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "submit_briefing" } },
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
  return JSON.parse(call.function.arguments);
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

    const [{ data: profile }, { data: topicsRows }, { data: rows }] = await Promise.all([
      admin.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
      admin.from("topics").select("name").eq("user_id", userId),
      admin
        .from("articles")
        .select("id, title, url, source, summary, relevance_score, velocity, topic_id, topics(name)")
        .eq("user_id", userId)
        .not("relevance_score", "is", null)
        .gte("relevance_score", 40)
        .order("relevance_score", { ascending: false })
        .limit(25),
    ]);

    if (!rows || rows.length < 3) {
      return new Response(
        JSON.stringify({ error: "Not enough scored articles yet. Run the pipeline first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const topicNames = (topicsRows ?? []).map((t: any) => t.name);
    const articles: ArticleRow[] = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      source: r.source,
      summary: r.summary,
      relevance_score: r.relevance_score,
      velocity: r.velocity,
      topic_name: r.topics?.name ?? null,
    }));

    const briefing = await assemble(articles, topicNames, profile?.display_name ?? null);

    // Validate referenced ids exist
    const validIds = new Set(articles.map((a) => a.id));
    briefing.top_stories = (briefing.top_stories ?? []).filter((s: any) => validIds.has(s.article_id));
    briefing.rising_trends = (briefing.rising_trends ?? []).filter((s: any) => validIds.has(s.article_id));

    const usedIds = Array.from(
      new Set([
        ...briefing.top_stories.map((s: any) => s.article_id),
        ...briefing.rising_trends.map((s: any) => s.article_id),
      ])
    );

    const today = new Date().toISOString().slice(0, 10);

    // Upsert by (user_id, briefing_date) — delete existing then insert (no unique constraint guaranteed)
    await admin.from("briefings").delete().eq("user_id", userId).eq("briefing_date", today);

    const { data: inserted, error: insErr } = await admin
      .from("briefings")
      .insert({
        user_id: userId,
        briefing_date: today,
        title: briefing.title,
        summary: briefing.intro,
        content: briefing,
        article_ids: usedIds,
      })
      .select()
      .single();

    if (insErr) throw insErr;

    return new Response(JSON.stringify({ briefing: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("assemble-briefing error", e);
    const msg = e instanceof Error ? e.message : "Unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
