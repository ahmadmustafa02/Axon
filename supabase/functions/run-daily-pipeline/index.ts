// Orchestrate scrape → filter → assemble for one or many users.
// Invoked by pg_cron every 15 minutes (no user JWT) and runs for all users
// whose delivery_time (in their timezone) is currently within the window.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL =
  Deno.env.get("AI_GATEWAY_URL") ??
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ---------- shared helpers ----------
async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchHN(topic: string, topicId: string) {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(topic)}&tags=story&hitsPerPage=15`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.hits ?? []).filter((h: any) => h.url && h.title).map((h: any) => ({
      source: "hackernews",
      url: h.url,
      title: h.title,
      published_at: h.created_at ?? null,
      raw_text: h.story_text ?? null,
      topic_id: topicId,
    }));
  } catch (e) {
    console.error("HN fetch failed", topic, e);
    return [];
  }
}

async function fetchDevTo(topic: string, topicId: string) {
  const tag = topic.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const url = `https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&per_page=15&top=7`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json ?? []).filter((a: any) => a.url && a.title).map((a: any) => ({
      source: "devto",
      url: a.url,
      title: a.title,
      published_at: a.published_at ?? null,
      raw_text: a.description ?? null,
      topic_id: topicId,
    }));
  } catch (e) {
    console.error("Dev.to fetch failed", topic, e);
    return [];
  }
}

async function aiCall(body: any) {
  const apiKey = Deno.env.get("AI_GATEWAY_API_KEY");
  if (!apiKey) throw new Error("AI_GATEWAY_API_KEY not configured");
  const res = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limited");
    if (res.status === 402) throw new Error("AI credits exhausted");
    throw new Error(`AI gateway ${res.status}: ${text}`);
  }
  const json = await res.json();
  const call = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("No tool call in response");
  return JSON.parse(call.function.arguments);
}

// ---------- pipeline stages ----------
async function scrapeForUser(admin: any, userId: string) {
  const { data: topics } = await admin.from("topics").select("id, name").eq("user_id", userId);
  if (!topics || topics.length === 0) return { inserted: 0 };

  const all: any[] = [];
  const results = await Promise.all(
    topics.flatMap((t: any) => [fetchHN(t.name, t.id), fetchDevTo(t.name, t.id)])
  );
  results.forEach((arr) => all.push(...arr));

  const seen = new Set<string>();
  const rows: any[] = [];
  for (const a of all) {
    const hash = await sha256(a.url);
    if (seen.has(hash)) continue;
    seen.add(hash);
    rows.push({
      user_id: userId,
      source: a.source,
      url: a.url,
      url_hash: hash,
      title: a.title,
      published_at: a.published_at,
      raw_text: a.raw_text,
      topic_id: a.topic_id,
    });
  }
  if (rows.length === 0) return { inserted: 0 };
  const { data: inserted } = await admin
    .from("articles")
    .upsert(rows, { onConflict: "user_id,url_hash", ignoreDuplicates: true })
    .select("id");
  return { inserted: inserted?.length ?? 0 };
}

async function filterForUser(admin: any, userId: string) {
  const { data: topics } = await admin.from("topics").select("name").eq("user_id", userId);
  const topicNames = (topics ?? []).map((t: any) => t.name);

  const { data: rows } = await admin
    .from("articles")
    .select("id, title, raw_text, source, topic_id, topics(name)")
    .eq("user_id", userId)
    .is("relevance_score", null)
    .order("fetched_at", { ascending: false })
    .limit(40);

  if (!rows || rows.length === 0) return { scored: 0 };

  const items = rows.map((r: any, i: number) => ({
    idx: i,
    title: r.title,
    snippet: (r.raw_text ?? "").slice(0, 400),
    source: r.source,
    topic: r.topics?.name ?? null,
  }));

  const scores = (await aiCall({
    model: Deno.env.get("AI_GATEWAY_MODEL") ?? "gemini-2.5-flash",
    messages: [
      {
        role: "system",
        content:
          `You are an expert news curator. Score each article 0-100 for relevance and assign a velocity tag.\n` +
          `User interests: ${topicNames.join(", ")}.\n` +
          `Velocity: "rising", "steady", or "noise".`,
      },
      { role: "user", content: `Score these articles:\n${JSON.stringify(items, null, 2)}` },
    ],
    tools: [{
      type: "function",
      function: {
        name: "submit_scores",
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
                  summary: { type: "string" },
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
    }],
    tool_choice: { type: "function", function: { name: "submit_scores" } },
  })).scores as Array<{ idx: number; relevance: number; velocity: string; summary: string }>;

  let updated = 0;
  for (const s of scores) {
    const a = rows[s.idx];
    if (!a) continue;
    const { error } = await admin.from("articles").update({
      relevance_score: s.relevance,
      velocity: s.velocity,
      summary: s.summary,
    }).eq("id", a.id);
    if (!error) updated++;
  }
  return { scored: updated };
}

async function assembleForUser(admin: any, userId: string) {
  const [{ data: profile }, { data: topicsRows }, { data: rows }] = await Promise.all([
    admin.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
    admin.from("topics").select("name").eq("user_id", userId),
    admin.from("articles")
      .select("id, title, url, source, summary, relevance_score, velocity, topic_id, topics(name)")
      .eq("user_id", userId)
      .not("relevance_score", "is", null)
      .gte("relevance_score", 40)
      .order("relevance_score", { ascending: false })
      .limit(25),
  ]);

  if (!rows || rows.length < 3) return { briefing: null, reason: "not_enough_articles" };

  const topicNames = (topicsRows ?? []).map((t: any) => t.name);
  const articles = rows.map((r: any) => ({
    id: r.id, title: r.title, source: r.source, summary: r.summary,
    relevance_score: r.relevance_score, velocity: r.velocity,
    topic_name: r.topics?.name ?? null,
  }));

  const items = articles.map((a, i) => ({
    idx: i, id: a.id, title: a.title, source: a.source, summary: a.summary,
    relevance: a.relevance_score, velocity: a.velocity, topic: a.topic_name,
  }));

  const briefing = await aiCall({
    model: Deno.env.get("AI_GATEWAY_MODEL") ?? "gemini-2.5-flash",
    messages: [
      {
        role: "system",
        content:
          `You are an expert daily briefing editor.\n` +
          `Reader: ${profile?.display_name ?? "the reader"}.\n` +
          `Their interests: ${topicNames.join(", ")}.\n\n` +
          `Rules:\n- Warm, intelligent 2-sentence intro.\n- Pick 3-5 top stories.\n- Pick 2-4 rising trends.\n- Use only article ids from input.\n- Each story: sharp 1-sentence "why" (max 25 words).\n- Punchy dated title like "Friday signal".`,
      },
      { role: "user", content: `Today's candidate articles:\n${JSON.stringify(items, null, 2)}` },
    ],
    tools: [{
      type: "function",
      function: {
        name: "submit_briefing",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            intro: { type: "string" },
            top_stories: {
              type: "array", minItems: 3, maxItems: 5,
              items: {
                type: "object",
                properties: { article_id: { type: "string" }, headline: { type: "string" }, why: { type: "string" } },
                required: ["article_id", "headline", "why"], additionalProperties: false,
              },
            },
            rising_trends: {
              type: "array", minItems: 0, maxItems: 4,
              items: {
                type: "object",
                properties: { article_id: { type: "string" }, headline: { type: "string" }, why: { type: "string" } },
                required: ["article_id", "headline", "why"], additionalProperties: false,
              },
            },
          },
          required: ["title", "intro", "top_stories", "rising_trends"],
          additionalProperties: false,
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "submit_briefing" } },
  });

  const validIds = new Set(articles.map((a) => a.id));
  briefing.top_stories = (briefing.top_stories ?? []).filter((s: any) => validIds.has(s.article_id));
  briefing.rising_trends = (briefing.rising_trends ?? []).filter((s: any) => validIds.has(s.article_id));

  const usedIds = Array.from(new Set([
    ...briefing.top_stories.map((s: any) => s.article_id),
    ...briefing.rising_trends.map((s: any) => s.article_id),
  ]));

  const today = new Date().toISOString().slice(0, 10);
  await admin.from("briefings").delete().eq("user_id", userId).eq("briefing_date", today);
  const { data: inserted } = await admin.from("briefings").insert({
    user_id: userId,
    briefing_date: today,
    title: briefing.title,
    summary: briefing.intro,
    content: briefing,
    article_ids: usedIds,
  }).select().single();

  return { briefing: inserted };
}

async function emailForUser(admin: any, userId: string, briefingId: string) {
  try {
    const res = await admin.functions.invoke("send-briefing-email", {
      body: { user_id: userId, briefing_id: briefingId },
    });
    if (res.error) throw res.error;
    return { sent: true };
  } catch (e) {
    console.error(`[email] user=${userId} failed:`, e);
    return { sent: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

async function runForUser(admin: any, userId: string, opts: { sendEmail: boolean }) {
  const scrape = await scrapeForUser(admin, userId);
  const filter = await filterForUser(admin, userId);
  const assemble = await assembleForUser(admin, userId);
  let email: any = null;
  if (opts.sendEmail && assemble.briefing?.id) {
    email = await emailForUser(admin, userId, assemble.briefing.id);
  }
  return { scrape, filter, assemble, email };
}

// Returns true if user's local clock (HH:MM) is within `windowMin` minutes of now.
function isDeliveryDue(deliveryTime: string, timezone: string, windowMin: number): boolean {
  // deliveryTime "07:00:00" in user's tz; compare to current time in tz
  const tz = timezone || "UTC";
  let nowParts: { hour: string; minute: string };
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const parts = fmt.formatToParts(new Date());
    nowParts = {
      hour: parts.find((p) => p.type === "hour")!.value,
      minute: parts.find((p) => p.type === "minute")!.value,
    };
  } catch {
    return false;
  }
  const nowMin = parseInt(nowParts.hour) * 60 + parseInt(nowParts.minute);
  const [hh, mm] = deliveryTime.split(":");
  const targetMin = parseInt(hh) * 60 + parseInt(mm);
  const diff = Math.abs(nowMin - targetMin);
  return diff <= windowMin || diff >= 1440 - windowMin;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }

    // Manual single-user run — caller can opt in/out of email (default off for manual)
    if (body.user_id && typeof body.user_id === "string") {
      const result = await runForUser(admin, body.user_id, { sendEmail: !!body.send_email });
      return new Response(JSON.stringify({ ok: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cron mode: find users whose delivery time is due within the window
    const windowMin = typeof body.window_min === "number" ? body.window_min : 8;
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("user_id, delivery_time, timezone, onboarded");
    if (error) throw error;

    const due = (profiles ?? []).filter((p: any) =>
      p.onboarded && isDeliveryDue(p.delivery_time, p.timezone, windowMin)
    );

    const results: any[] = [];
    for (const p of due) {
      try {
        const r = await runForUser(admin, p.user_id, { sendEmail: true });
        results.push({ user_id: p.user_id, ok: true, ...r });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown";
        console.error(`[pipeline] user=${p.user_id} failed:`, msg);
        results.push({ user_id: p.user_id, ok: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ checked: profiles?.length ?? 0, ran: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("run-daily-pipeline error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
