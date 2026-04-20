// Scrape articles for the calling user's topics from HN (Algolia) + Dev.to
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface RawArticle {
  source: string;
  url: string;
  title: string;
  published_at: string | null;
  raw_text: string | null;
  topic_id: string;
}

async function fetchHN(topic: string, topicId: string): Promise<RawArticle[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(topic)}&tags=story&hitsPerPage=15`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.hits ?? [])
      .filter((h: any) => h.url && h.title)
      .map((h: any) => ({
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

async function fetchDevTo(topic: string, topicId: string): Promise<RawArticle[]> {
  const tag = topic.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const url = `https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&per_page=15&top=7`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json ?? [])
      .filter((a: any) => a.url && a.title)
      .map((a: any) => ({
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

    // Identify user from JWT
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Service role for writes (bypasses RLS, set user_id explicitly)
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: topics, error: topicsErr } = await admin
      .from("topics")
      .select("id, name")
      .eq("user_id", userId);

    if (topicsErr) throw topicsErr;
    if (!topics || topics.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, skipped: 0, message: "No topics" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all sources in parallel
    const all: RawArticle[] = [];
    const results = await Promise.all(
      topics.flatMap((t) => [fetchHN(t.name, t.id), fetchDevTo(t.name, t.id)])
    );
    results.forEach((arr) => all.push(...arr));

    if (all.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, skipped: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute hashes + dedupe within batch
    const seen = new Set<string>();
    const rows = [];
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

    // Upsert ignoring conflicts on (user_id, url_hash)
    const { data: inserted, error: insErr } = await admin
      .from("articles")
      .upsert(rows, { onConflict: "user_id,url_hash", ignoreDuplicates: true })
      .select("id");

    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({
        inserted: inserted?.length ?? 0,
        scanned: rows.length,
        topics: topics.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("scrape-sources error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
