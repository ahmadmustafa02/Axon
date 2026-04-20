const faqs = [
  {
    q: "How is this different from a newsletter?",
    a: "Newsletters are written for everyone. Axon's briefing is generated for you — based on your specific topics, the velocity of those topics today, and what you've thumbs-upped before.",
  },
  {
    q: "What's trend velocity?",
    a: "Axon compares how often a topic appeared in the last 24 hours vs the previous 24. If something jumps from 3 mentions to 47, you'll see it flagged as exploding 🔴 — before it hits the front page everywhere.",
  },
  {
    q: "Do I have to check a dashboard?",
    a: "No. Axon is autonomous — once you set your topics and delivery time, the briefing arrives by email every morning. The dashboard is there when you want to dig deeper.",
  },
  {
    q: "Where do the stories come from?",
    a: "Axon pulls from a curated set of high-signal feeds across tech, product, and research — and expands as new sources prove themselves. The mix stays under the hood so the briefing stays clean.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="border-t border-foreground/10">
      <div className="container py-24 md:py-32">
        <div className="mb-14 max-w-2xl">
          <p className="eyebrow">FAQ</p>
          <h2 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
            Questions, <em className="italic text-accent">briefly</em> answered.
          </h2>
        </div>

        <dl className="divide-y divide-foreground/10 border-y border-foreground/10">
          {faqs.map((f) => (
            <div key={f.q} className="grid gap-2 py-8 md:grid-cols-[1fr_2fr] md:gap-12">
              <dt className="font-display text-xl font-medium tracking-tight">{f.q}</dt>
              <dd className="text-foreground/65 leading-relaxed">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};

export default FAQ;
