const steps = [
  {
    n: "01",
    title: "Pick your signals",
    body: "Choose 3 to 10 topics you actually care about — \"LLMs\", \"climate tech\", \"design systems\". Axon takes it from there.",
  },
  {
    n: "02",
    title: "Axon hunts the web",
    body: "Every 24 hours it scans high-signal feeds across tech, product and research — then a Gemini-powered filter throws out the noise.",
  },
  {
    n: "03",
    title: "One briefing, in your inbox",
    body: "Clustered stories, trend velocity, and a written analyst-style summary. Delivered at the time you choose.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how" className="border-t border-foreground/10">
      <div className="container py-24 md:py-32">
        <div className="mb-16 max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
            From <em className="italic text-accent">infinite scroll</em> to a single briefing.
          </h2>
        </div>

        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.n}
              className="group relative overflow-hidden rounded-3xl border border-foreground/10 bg-card p-8 transition-all hover:border-accent/40 hover:shadow-[0_20px_40px_-25px_hsl(var(--accent)/0.5)]"
            >
              {/* Big orange numeral */}
              <div className="flex items-center justify-between">
                <span className="font-display text-6xl font-medium leading-none text-accent">
                  {s.n}
                </span>
                <span className="h-px w-16 bg-foreground/15 group-hover:bg-accent/60 transition-colors" />
              </div>
              <h3 className="mt-8 font-display text-2xl font-medium leading-snug tracking-tight">
                {s.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-foreground/65">
                {s.body}
              </p>
              {/* Subtle orange glow on hover */}
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-accent/0 blur-3xl transition-all group-hover:bg-accent/30"
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default HowItWorks;
