import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Loader2, Mail, Sparkles, TrendingUp } from "lucide-react";
import FeedbackButtons from "@/components/FeedbackButtons";

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

interface BriefingRow {
  id: string;
  briefing_date: string;
  title: string | null;
  summary: string | null;
  content: BriefingContent | null;
  article_ids: string[] | null;
  created_at: string;
}

interface ArticleLite {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string | null;
}

const Briefing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [briefing, setBriefing] = useState<BriefingRow | null>(null);
  const [articles, setArticles] = useState<Record<string, ArticleLite>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const queryDate = searchParams.get("date");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const targetDate = queryDate || today;
  const isPast = !!queryDate && queryDate !== today;

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: b } = await supabase
      .from("briefings")
      .select("id, briefing_date, title, summary, content, article_ids, created_at, opened_at")
      .eq("user_id", user.id)
      .eq("briefing_date", targetDate)
      .maybeSingle();

    const row = b as unknown as (BriefingRow & { opened_at: string | null }) | null;
    setBriefing(row);

    const ids = (row?.article_ids ?? []) as string[];
    if (ids.length > 0) {
      const { data: arts } = await supabase
        .from("articles")
        .select("id, title, url, source, summary")
        .in("id", ids);
      const map: Record<string, ArticleLite> = {};
      (arts ?? []).forEach((a) => (map[a.id] = a as ArticleLite));
      setArticles(map);
    } else {
      setArticles({});
    }
    setLoading(false);

    if (row && !row.opened_at) {
      await supabase.from("briefings").update({ opened_at: new Date().toISOString() }).eq("id", row.id);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, targetDate]);

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("assemble-briefing");
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Today's briefing is ready.");
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to assemble briefing.");
    } finally {
      setGenerating(false);
    }
  };

  const sendEmail = async () => {
    if (sending || !briefing) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-briefing-email", {
        body: { briefing_id: briefing.id, app_url: window.location.origin },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Sent to ${(data as any)?.sent_to ?? "your inbox"}.`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  const dateLabel = new Date(targetDate + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const renderItem = (item: BriefingItem, i: number) => {
    const a = articles[item.article_id];
    return (
      <li
        key={item.article_id + i}
        className="group rounded-2xl border border-foreground/10 bg-card p-6 transition-colors hover:border-accent/40"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {a && (
              <p className="text-xs uppercase tracking-wider text-foreground/50">{a.source}</p>
            )}
            <h3 className="mt-2 font-display text-xl font-medium leading-snug tracking-tight">
              {item.headline}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/65">{item.why}</p>
            {a && (
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                Read source <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          {a && <FeedbackButtons articleId={a.id} />}
        </div>
      </li>
    );
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground/10">
        <div className="container flex items-center justify-between py-5">
          <Logo />
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Button>
        </div>
      </header>

      <section className="container max-w-3xl py-12 md:py-16">
        <p className="eyebrow">{dateLabel}</p>

        {loading ? (
          <div className="mt-10 flex items-center gap-3 text-foreground/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading briefing…
          </div>
        ) : !briefing ? (
          <div className="mt-8">
            <h1 className="font-display text-4xl font-medium leading-tight tracking-tight md:text-5xl">
              {isPast ? (
                <>No briefing for <em className="italic text-accent">{dateLabel}</em>.</>
              ) : (
                <>No briefing yet for <em className="italic text-accent">today</em>.</>
              )}
            </h1>
            <p className="mt-4 text-foreground/60">
              {isPast
                ? "We don't have a saved briefing for this date."
                : "Assemble one from your highest-scoring articles. Make sure you've run the pipeline first."}
            </p>
            {!isPast && (
            <Button size="lg" className="mt-6 gap-2" onClick={generate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Assembling…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Assemble today's briefing
                </>
              )}
            </Button>
            )}
          </div>
        ) : (
          <div className="mt-8">
            <h1 className="font-display text-4xl font-medium leading-tight tracking-tight md:text-5xl">
              {briefing.title ?? "Today's briefing"}
            </h1>
            {briefing.summary && (
              <p className="mt-5 text-lg leading-relaxed text-foreground/75">{briefing.summary}</p>
            )}

            <div className="mt-12">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <p className="eyebrow !mt-0">Top stories</p>
              </div>
              <ul className="mt-5 space-y-3">
                {(briefing.content?.top_stories ?? []).map(renderItem)}
              </ul>
            </div>

            {(briefing.content?.rising_trends?.length ?? 0) > 0 && (
              <div className="mt-12">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  <p className="eyebrow !mt-0">Rising trends</p>
                </div>
                <ul className="mt-5 space-y-3">
                  {(briefing.content?.rising_trends ?? []).map(renderItem)}
                </ul>
              </div>
            )}

            <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-6">
              <p className="text-sm text-foreground/50">
                Assembled {new Date(briefing.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={sendEmail} disabled={sending} className="gap-2">
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                  Email me this briefing
                </Button>
                <Button variant="outline" size="sm" onClick={generate} disabled={generating} className="gap-2">
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Regenerate
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default Briefing;
