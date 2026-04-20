import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="border-t border-foreground/10">
      <div className="container py-12">
        <div className="relative overflow-hidden rounded-[2rem] bg-accent px-8 py-20 text-center text-accent-foreground md:px-16 md:py-28">
          {/* Decorative rings */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full border border-accent-foreground/10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-40 -bottom-40 h-[28rem] w-[28rem] rounded-full border border-accent-foreground/10"
          />

          <p className="text-xs uppercase tracking-[0.22em] text-accent-foreground/75 font-semibold">
            Start free
          </p>
          <h2 className="mx-auto mt-5 max-w-3xl font-display text-5xl font-medium leading-[1.02] tracking-tight md:text-7xl">
            Wake up to <em className="italic">signal</em>,
            <br /> not noise.
          </h2>
          <p className="mx-auto mt-6 max-w-md text-accent-foreground/75 leading-relaxed">
            Set your topics once. Axon runs the loop forever.
          </p>
          <div className="mt-10 flex justify-center">
            <Button
              asChild
              size="lg"
              variant="ink"
              className="bg-foreground text-background hover:bg-foreground/90 shadow-[0_12px_30px_-12px_hsl(var(--foreground)/0.5)]"
            >
              <Link to="/auth">
                Set up your briefing
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
