import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { toast } from "sonner";
import { Loader2, Sparkles, TrendingUp, Activity, MinusCircle, ExternalLink } from "lucide-react";
import FeedbackButtons from "@/components/FeedbackButtons";
import FeedFilters, { VelocityFilter } from "@/components/dashboard/FeedFilters";
import KeyboardHints from "@/components/dashboard/KeyboardHints";

interface Profile {
  display_name: string | null;
  delivery_time: string;
  timezone: string;
}

interface TopicRow {
  id: string;
  name: string;
}

interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string | null;
  relevance_score: number | null;
  velocity: string | null;
  fetched_at: string;
  topic_id: string | null;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState<string>("");

  // Filters
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [velocity, setVelocity] = useState<VelocityFilter>("all");
  const [minScore, setMinScore] = useState(0);

  const loadAll = useCallback(async () => {
    if (!user) return;
    const [{ data: p }, { data: t }, { data: a }] = await Promise.all([
      supabase.from("profiles").select("display_name, delivery_time, timezone").eq("user_id", user.id).maybeSingle(),
      supabase.from("topics").select("id, name").eq("user_id", user.id).order("created_at"),
      supabase
        .from("articles")
        .select("id, title, url, source, summary, relevance_score, velocity, fetched_at, topic_id")
        .eq("user_id", user.id)
        .order("relevance_score", { ascending: false, nullsFirst: false })
        .order("fetched_at", { ascending: false })
        .limit(50),
    ]);
    setProfile(p ?? null);
    setTopics((t ?? []) as TopicRow[]);
    setArticles((a ?? []) as Article[]);
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out.");
    navigate("/", { replace: true });
  };

  const runPipeline = async () => {
    if (running) return;
    setRunning(true);
    try {
      setStep("Scraping sources…");
      const { data: scrape, error: scrapeErr } = await supabase.functions.invoke("scrape-sources");
      if (scrapeErr) throw scrapeErr;
      toast.success(`Scraped ${scrape?.inserted ?? 0} new article${scrape?.inserted === 1 ? "" : "s"}.`);

      setStep("Scoring with AI…");
      const { data: filter, error: filterErr } = await supabase.functions.invoke("filter-articles");
      if (filterErr) throw filterErr;
      toast.success(`Scored ${filter?.scored ?? 0} article${filter?.scored === 1 ? "" : "s"}.`);

      await loadAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Pipeline failed.");
    } finally {
      setRunning(false);
      setStep("");
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key.toLowerCase();
      if (k === "r") {
        e.preventDefault();
        runPipeline();
      } else if (k === "b") {
        e.preventDefault();
        navigate("/briefing");
      } else if (k === "a") {
        e.preventDefault();
        navigate("/briefings");
      } else if (k === "c") {
        e.preventDefault();
        setSelectedTopic(null);
        setVelocity("all");
        setMinScore(0);
        toast.success("Filters cleared.");
      } else if (k === "f") {
        e.preventDefault();
        document.getElementById("feed-filters")?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (e.key === "?") {
        e.preventDefault();
        toast.message("Shortcuts", {
          description: "R run · B briefing · A archive · F filters · C clear",
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, topics.length]);

  const topicNameById = useMemo(() => {
    const m = new Map<string, string>();
    topics.forEach((t) => m.set(t.id, t.name));
    return m;
  }, [topics]);

  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      if (selectedTopic && topicNameById.get(a.topic_id ?? "") !== selectedTopic) return false;
      if (velocity !== "all" && a.velocity !== velocity) return false;
      if (minScore > 0 && (a.relevance_score ?? 0) < minScore) return false;
      return true;
    });
  }, [articles, selectedTopic, velocity, minScore, topicNameById]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const timeUntilDelivery = (deliveryTime: string, timezone: string) => {
    try {
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone || "UTC", hour: "2-digit", minute: "2-digit", hour12: false,
      });
      const parts = fmt.formatToParts(new Date());
      const nowH = parseInt(parts.find((p) => p.type === "hour")!.value);
      const nowM = parseInt(parts.find((p) => p.type === "minute")!.value);
      const [th, tm] = deliveryTime.split(":").map(Number);
      let diff = (th * 60 + tm) - (nowH * 60 + nowM);
      if (diff <= 0) diff += 24 * 60;
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      if (hours === 0) return `${mins}m`;
      if (mins === 0) return `${hours}h`;
      return `${hours}h ${mins}m`;
    } catch {
      return "—";
    }
  };

  const velocityIcon = (v: string | null) => {
    if (v === "rising") return <TrendingUp className="h-3.5 w-3.5" />;
    if (v === "steady") return <Activity className="h-3.5 w-3.5" />;
    return <MinusCircle className="h-3.5 w-3.5" />;
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground/10">
        <div className="container flex items-center justify-between py-5">
          <Logo />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <section className="container py-12 md:py-16">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Today</p>
            <h1 className="mt-3 font-display text-4xl font-medium leading-tight tracking-tight md:text-6xl">
              {greeting}
              {profile?.display_name ? (
                <>
                  , <em className="italic text-accent">{profile.display_name.split(" ")[0]}</em>
                </>
              ) : (
                "."
              )}
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigate("/briefings")}
              className="gap-2"
            >
              Archive
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/briefing")}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" /> View today's briefing
            </Button>
            <Button
              size="lg"
              onClick={runPipeline}
              disabled={running || topics.length === 0}
              className="gap-2"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {step || "Running…"}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Run pipeline now
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-foreground/10 bg-card p-8">
            <p className="eyebrow">Your signals</p>
            <h2 className="mt-3 font-display text-2xl font-medium tracking-tight">
              {topics.length} topic{topics.length === 1 ? "" : "s"} tracked
            </h2>
            <div className="mt-6 flex flex-wrap gap-2">
              {topics.map((t) => (
                <span
                  key={t.id}
                  className="rounded-full bg-accent/15 px-3 py-1.5 text-sm text-accent"
                >
                  {t.name}
                </span>
              ))}
              {topics.length === 0 && (
                <span className="text-sm text-foreground/50">No topics yet.</span>
              )}
            </div>
            <Button variant="outline" size="sm" className="mt-6" onClick={() => navigate("/onboarding")}>
              Edit topics
            </Button>
          </div>

          <div className="rounded-3xl border border-foreground/10 bg-card p-8">
            <p className="eyebrow">Delivery</p>
            <h2 className="mt-3 font-display text-2xl font-medium tracking-tight">
              Every day at <span className="text-accent">{profile?.delivery_time?.slice(0, 5) ?? "07:00"}</span>
            </h2>
            <p className="mt-3 text-sm text-foreground/60">
              Timezone: {profile?.timezone ?? "UTC"}
            </p>
            {profile && (
              <p className="mt-6 text-sm text-foreground/55 leading-relaxed">
                Next auto-briefing in{" "}
                <span className="text-accent font-medium">
                  {timeUntilDelivery(profile.delivery_time, profile.timezone)}
                </span>
                . The pipeline runs on its own each morning.
              </p>
            )}
          </div>
        </div>

        {/* Article feed */}
        <div className="mt-14" id="feed-filters">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="eyebrow">Latest signal</p>
              <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
                Top articles, <em className="italic text-accent">ranked.</em>
              </h2>
            </div>
            <p className="text-sm text-foreground/50">{articles.length} fetched</p>
          </div>

          <FeedFilters
            topics={topics.map((t) => t.name)}
            selectedTopic={selectedTopic}
            onTopicChange={setSelectedTopic}
            velocity={velocity}
            onVelocityChange={setVelocity}
            minScore={minScore}
            onMinScoreChange={setMinScore}
            totalCount={articles.length}
            filteredCount={filteredArticles.length}
          />

          <KeyboardHints />

          {articles.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-foreground/15 bg-card/50 p-10 text-center">
              <p className="text-foreground/60">
                No articles yet. Click <span className="text-accent font-medium">Run pipeline now</span> to fetch from Hacker News and Dev.to.
              </p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-foreground/15 bg-card/50 p-10 text-center">
              <p className="text-foreground/60">
                No articles match your filters. Press <kbd className="rounded border border-foreground/15 bg-background px-1.5 py-0.5 font-mono text-xs">C</kbd> to clear.
              </p>
            </div>
          ) : (
            <ul className="mt-8 space-y-3">
              {filteredArticles.map((a) => (
                <li
                  key={a.id}
                  className="group rounded-2xl border border-foreground/10 bg-card p-5 transition-colors hover:border-accent/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-foreground/50">
                        <span className="uppercase tracking-wider">{a.source}</span>
                        {a.velocity && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-accent">
                            {velocityIcon(a.velocity)} {a.velocity}
                          </span>
                        )}
                        {typeof a.relevance_score === "number" && (
                          <span className="text-foreground/40">· {Math.round(a.relevance_score)}/100</span>
                        )}
                        {a.topic_id && topicNameById.get(a.topic_id) && (
                          <span className="text-foreground/40">· {topicNameById.get(a.topic_id)}</span>
                        )}
                      </div>
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block font-display text-lg font-medium leading-snug tracking-tight group-hover:text-accent"
                      >
                        {a.title}
                      </a>
                      {a.summary && (
                        <p className="mt-2 text-sm text-foreground/65 leading-relaxed">{a.summary}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground/40 hover:text-accent"
                        aria-label="Open article"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <FeedbackButtons articleId={a.id} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
