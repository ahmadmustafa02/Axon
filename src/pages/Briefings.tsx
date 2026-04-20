import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { ArrowLeft, ArrowRight, Loader2, Mail } from "lucide-react";

interface BriefingRow {
  id: string;
  briefing_date: string;
  title: string | null;
  summary: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  article_ids: string[] | null;
}

const Briefings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<BriefingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from("briefings")
        .select("id, briefing_date, title, summary, delivered_at, opened_at, article_ids")
        .eq("user_id", user.id)
        .order("briefing_date", { ascending: false })
        .limit(100);
      setRows((data ?? []) as BriefingRow[]);
      setLoading(false);
    };
    load();
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);

  const fmtDate = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: dt.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
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
        <p className="eyebrow">Archive</p>
        <h1 className="mt-3 font-display text-4xl font-medium leading-tight tracking-tight md:text-5xl">
          Every briefing, <em className="italic text-accent">in order.</em>
        </h1>
        <p className="mt-4 text-foreground/60">
          Your last 100 daily briefings. Click any to re-read.
        </p>

        {loading ? (
          <div className="mt-12 flex items-center gap-3 text-foreground/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading archive…
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-foreground/15 bg-card/50 p-10 text-center">
            <p className="text-foreground/60">
              No briefings yet. Once you assemble one, it'll appear here.
            </p>
            <Button className="mt-6 gap-2" onClick={() => navigate("/briefing")}>
              Go to today's briefing <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <ul className="mt-10 space-y-3">
            {rows.map((b) => {
              const isToday = b.briefing_date === today;
              const count = b.article_ids?.length ?? 0;
              const target = isToday ? "/briefing" : `/briefing?date=${b.briefing_date}`;
              return (
                <li key={b.id}>
                  <button
                    onClick={() => navigate(target)}
                    className="group block w-full rounded-2xl border border-foreground/10 bg-card p-6 text-left transition-colors hover:border-accent/40"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <p className="text-xs uppercase tracking-wider text-foreground/50">
                        {fmtDate(b.briefing_date)}
                        {isToday && (
                          <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-accent">today</span>
                        )}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-foreground/40">
                        {b.delivered_at && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" /> sent
                          </span>
                        )}
                        <span>{count} article{count === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                    <h2 className="mt-3 font-display text-2xl font-medium leading-snug tracking-tight group-hover:text-accent">
                      {b.title ?? "Untitled briefing"}
                    </h2>
                    {b.summary && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/65">
                        {b.summary}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
};

export default Briefings;
