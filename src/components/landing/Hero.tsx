import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Orange ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -top-32 -z-10 h-[700px] w-[1100px] -translate-x-1/2 opacity-40"
        style={{
          background:
            "radial-gradient(closest-side, hsl(var(--accent) / 0.55) 0%, transparent 70%)",
        }}
      />

      <div className="container pt-14 pb-20 md:pt-24 md:pb-28 text-center">
        {/* Eyebrow chip */}
        <div className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-xs text-accent backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-pulse-dot" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          <span className="tracking-wide font-medium">Autonomous briefing agent · in private beta</span>
        </div>

        {/* Headline */}
        <h1 className="mx-auto mt-8 max-w-4xl font-display text-[46px] font-medium leading-[0.98] tracking-[-0.03em] text-foreground sm:text-[72px] md:text-[96px] animate-fade-up">
          Signal{" "}
          <em className="italic font-display text-accent">before</em>
          <br className="hidden sm:block" /> the noise.
        </h1>

        {/* Subhead */}
        <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-foreground/70 sm:text-lg animate-fade-up [animation-delay:80ms]">
          Axon is an autonomous intelligence agent. Pick the topics that matter,
          and every morning it scans the web, filters the noise, and clusters
          everything into a single sharp briefing — written for you, not the
          algorithm.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-up [animation-delay:160ms]">
          <Button asChild size="lg">
            <Link to="/auth">
              Start your briefing
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#how">See how it works</a>
          </Button>
        </div>

        {/* Hero mockup — briefing card preview */}
        <div className="relative mx-auto mt-20 max-w-3xl animate-fade-up [animation-delay:280ms]">
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-accent/15 blur-2xl" />
          <div className="overflow-hidden rounded-3xl border border-foreground/10 bg-card text-left shadow-[0_24px_60px_-30px_hsl(var(--accent)/0.4),0_8px_30px_-15px_hsl(var(--foreground)/0.15)]">
            {/* Mock window header */}
            <div className="flex items-center justify-between border-b border-foreground/10 bg-secondary/40 px-5 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              </div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-foreground/50">
                axon · daily briefing · tue 17 apr
              </span>
              <span className="h-2.5 w-2.5" />
            </div>
            {/* Briefing rows */}
            <div className="divide-y divide-foreground/10 px-6 py-2">
              <BriefRow tag="AI" velocity="hot" title="Anthropic ships agentic Claude with native tool routing" count="14 sources" />
              <BriefRow tag="Climate" velocity="rising" title="Direct-air capture costs cross the $200/ton threshold" count="9 sources" />
              <BriefRow tag="Design" velocity="steady" title="Vercel rolls out a unified design tokens spec" count="6 sources" />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mx-auto mt-20 grid max-w-2xl grid-cols-3 gap-6 border-t border-foreground/10 pt-10 animate-fade-up [animation-delay:340ms]">
          <Stat value="24h" label="auto refresh" />
          <Stat value="0" label="apps to check" />
          <Stat value="1" label="briefing, zero scroll" />
        </div>
      </div>
    </section>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="text-center">
    <div className="font-display text-3xl font-medium text-foreground sm:text-5xl">{value}</div>
    <div className="mt-2 eyebrow !text-foreground/55">{label}</div>
  </div>
);

const velocityColor: Record<string, string> = {
  hot: "bg-accent",
  rising: "bg-accent/60",
  steady: "bg-foreground/30",
};

const BriefRow = ({
  tag,
  velocity,
  title,
  count,
}: {
  tag: string;
  velocity: keyof typeof velocityColor;
  title: string;
  count: string;
}) => (
  <div className="flex items-center gap-4 py-4">
    <span className={`h-2 w-2 shrink-0 rounded-full ${velocityColor[velocity]}`} />
    <span className="shrink-0 rounded-full border border-foreground/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground/60">
      {tag}
    </span>
    <span className="flex-1 truncate text-[15px] font-medium text-foreground">{title}</span>
    <span className="hidden shrink-0 text-xs text-foreground/45 sm:inline">{count}</span>
  </div>
);

export default Hero;
