// Send a branded HTML email of an assembled briefing via Resend.
// Two modes:
//   - Service-role / cron: { user_id, briefing_id? } — sends to that user's email.
//   - User JWT: { briefing_id? } — sends to the calling user's email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_GATEWAY_URL = Deno.env.get("RESEND_GATEWAY_URL");

interface BriefingItem {
  article_id: string;
  headline: string;
  why: string;
}
interface BriefingContent {
  title: string;
  intro: string;
  top_stories: BriefingItem[];
  rising_trends: BriefingItem[];
}

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderHtml(opts: {
  briefing: BriefingContent;
  articlesById: Record<string, { url: string; source: string }>;
  displayName: string | null;
  appUrl: string;
  briefingDate: string;
}) {
  const { briefing, articlesById, displayName, appUrl, briefingDate } = opts;
  const ORANGE = "#FF5A1F";
  const BG = "#0B0B0C";
  const PANEL = "#141416";
  const TEXT = "#F5F5F2";
  const MUTED = "#8A8A8E";
  const BORDER = "#222226";

  const renderItem = (s: BriefingItem) => {
    const a = articlesById[s.article_id];
    const url = a?.url ? escape(a.url) : "#";
    const source = a?.source ? escape(a.source) : "";
    return `
      <tr><td style="padding:0 0 22px 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${PANEL};border:1px solid ${BORDER};border-radius:14px;">
          <tr><td style="padding:18px 20px;">
            ${source ? `<div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};margin:0 0 8px 0;">${source}</div>` : ""}
            <a href="${url}" style="display:block;color:${TEXT};text-decoration:none;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.35;font-weight:500;margin:0 0 10px 0;">${escape(s.headline)}</a>
            <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.55;color:${MUTED};">${escape(s.why)}</div>
            <a href="${url}" style="display:inline-block;margin-top:12px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${ORANGE};text-decoration:none;">Read &rarr;</a>
          </td></tr>
        </table>
      </td></tr>`;
  };

  const top = briefing.top_stories.map(renderItem).join("");
  const rising = briefing.rising_trends.map(renderItem).join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(briefing.title)}</title></head>
<body style="margin:0;padding:0;background:${BG};color:${TEXT};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BG};">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
        <tr><td style="padding:0 0 28px 0;">
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${ORANGE};">Daily briefing &middot; ${escape(briefingDate)}</div>
          <h1 style="margin:14px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:36px;line-height:1.1;color:${TEXT};">${escape(briefing.title)}</h1>
          ${displayName ? `<div style="margin-top:12px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${MUTED};">For ${escape(displayName)}</div>` : ""}
        </td></tr>

        <tr><td style="padding:0 0 28px 0;">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.55;color:${TEXT};">${escape(briefing.intro)}</p>
        </td></tr>

        <tr><td style="padding:0 0 16px 0;">
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${ORANGE};">Top stories</div>
          <div style="height:1px;background:${BORDER};margin:10px 0 18px 0;"></div>
        </td></tr>
        ${top}

        ${rising ? `
        <tr><td style="padding:6px 0 16px 0;">
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${ORANGE};">Rising</div>
          <div style="height:1px;background:${BORDER};margin:10px 0 18px 0;"></div>
        </td></tr>
        ${rising}` : ""}

        <tr><td style="padding:24px 0 0 0;text-align:center;">
          <a href="${escape(appUrl)}/briefing" style="display:inline-block;background:${ORANGE};color:#0B0B0C;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;padding:14px 26px;border-radius:999px;">Open in app</a>
        </td></tr>

        <tr><td style="padding:36px 0 0 0;border-top:1px solid ${BORDER};margin-top:28px;">
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:${MUTED};line-height:1.55;text-align:center;padding-top:20px;">
            You're receiving this because you signed up for daily briefings.<br/>
            <a href="${escape(appUrl)}/dashboard" style="color:${MUTED};text-decoration:underline;">Manage preferences</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendOne(admin: any, userId: string, briefingId: string | null, appUrl: string) {
  // Get user email + name
  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(userId);
  if (authErr || !authUser?.user?.email) throw new Error("User has no email on file.");
  const email = authUser.user.email;

  const { data: profile } = await admin.from("profiles").select("display_name").eq("user_id", userId).maybeSingle();

  // Get briefing
  let briefingQ = admin.from("briefings").select("*").eq("user_id", userId);
  if (briefingId) briefingQ = briefingQ.eq("id", briefingId);
  else briefingQ = briefingQ.order("briefing_date", { ascending: false });
  const { data: briefingRow } = await briefingQ.limit(1).maybeSingle();
  if (!briefingRow) throw new Error("No briefing found.");
  const content = briefingRow.content as BriefingContent;
  if (!content?.top_stories?.length) throw new Error("Briefing has no stories.");

  // Look up urls/sources for the referenced articles
  const ids = (briefingRow.article_ids ?? []) as string[];
  const articlesById: Record<string, { url: string; source: string }> = {};
  if (ids.length) {
    const { data: arts } = await admin.from("articles").select("id, url, source").in("id", ids);
    for (const a of arts ?? []) articlesById[a.id] = { url: a.url, source: a.source };
  }

  const html = renderHtml({
    briefing: content,
    articlesById,
    displayName: profile?.display_name ?? null,
    appUrl,
    briefingDate: briefingRow.briefing_date,
  });

  const GATEWAY_API_KEY = Deno.env.get("GATEWAY_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_GATEWAY_URL) throw new Error("RESEND_GATEWAY_URL missing");
  if (!GATEWAY_API_KEY) throw new Error("GATEWAY_API_KEY missing");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing — connect Resend.");

  const subject = `${content.title} — ${briefingRow.briefing_date}`;
  const res = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GATEWAY_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: "Daily Briefing <onboarding@resend.dev>",
      to: [email],
      subject,
      html,
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(json)}`);

  // Mark delivered
  await admin.from("briefings").update({ delivered_at: new Date().toISOString() }).eq("id", briefingRow.id);

  return { sent_to: email, briefing_id: briefingRow.id, message_id: json.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }

    // Determine app URL for "Open in app" links
    const origin = req.headers.get("origin") ?? "";
    const appUrl = body.app_url || origin;

    let userId: string | null = body.user_id ?? null;

    // If no explicit user_id, require user JWT
    if (!userId) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Missing auth or user_id" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(
        SUPABASE_URL,
        Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: u, error: ue } = await userClient.auth.getUser();
      if (ue || !u.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = u.user.id;
    }

    const result = await sendOne(admin, userId, body.briefing_id ?? null, appUrl);
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-briefing-email error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
