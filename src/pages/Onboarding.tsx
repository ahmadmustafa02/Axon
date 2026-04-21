import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { X } from "lucide-react";

const SUGGESTED = [
  "AI agents",
  "LLMs",
  "Climate tech",
  "Design systems",
  "Robotics",
  "Bioengineering",
  "Indie hacking",
  "Open source",
  "Crypto",
  "Space",
];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [topics, setTopics] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("07:00");
  const [timezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (submittingRef.current) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("display_name, delivery_time, onboarded")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (submittingRef.current) return;
        if (data?.display_name) setDisplayName(data.display_name);
        if (data?.delivery_time) setDeliveryTime(data.delivery_time.slice(0, 5));
        if (data?.onboarded) navigate("/dashboard", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);


  const addTopic = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    if (topics.length >= 10) {
      toast.error("Max 10 topics");
      return;
    }
    if (topics.some((t) => t.toLowerCase() === name.toLowerCase())) return;
    setTopics([...topics, name]);
    setInput("");
  };

  const removeTopic = (t: string) => setTopics(topics.filter((x) => x !== t));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTopic(input);
    } else if (e.key === "Backspace" && !input && topics.length) {
      setTopics(topics.slice(0, -1));
    }
  };

  const handleNext = () => {
    if (topics.length < 3) {
      toast.error("Pick at least 3 topics");
      return;
    }
    setStep(2);
  };

  const handleFinish = async () => {
    if (!user) return;
    if (topics.length < 3) {
      toast.error("Pick at least 3 topics");
      setStep(1);
      return;
    }
    setSubmitting(true);
    submittingRef.current = true;

    // Insert topics
    const rows = topics.map((name) => ({ user_id: user.id, name }));
    const { error: topicErr } = await supabase
      .from("topics")
      .upsert(rows, { onConflict: "user_id,name" });
    if (topicErr) {
      toast.error("Could not save topics: " + topicErr.message);
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    // Update profile
    const { error: profErr } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        delivery_time: deliveryTime,
        timezone,
        onboarded: true,
      })
      .eq("user_id", user.id);
    if (profErr) {
      toast.error("Could not save profile: " + profErr.message);
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    toast.success("You're all set. First briefing brewing.");
    await new Promise(r => setTimeout(r, 600));
    submittingRef.current = false;
    setSubmitting(false);
    navigate("/dashboard", { replace: true });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="container flex items-center justify-between py-5">
        <Logo />
        <span className="text-xs uppercase tracking-[0.18em] text-foreground/50">
          Step {step} of 2
        </span>
      </header>

      <section className="container max-w-2xl pb-24 pt-10 md:pt-16">
        {step === 1 ? (
          <>
            <p className="eyebrow">Your signals</p>
            <h1 className="mt-3 font-display text-4xl font-medium leading-tight tracking-tight md:text-5xl">
              What should Axon <em className="italic text-accent">listen for?</em>
            </h1>
            <p className="mt-4 text-foreground/65 leading-relaxed">
              Pick 3 to 10 topics. Be specific — "AI agents" beats "tech." You can change these any time.
            </p>

            <div className="mt-10 rounded-3xl border border-foreground/10 bg-card p-6 md:p-8">
              {/* Selected topics */}
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-foreground/10 bg-background p-3 min-h-[64px]">
                {topics.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-sm text-accent"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTopic(t)}
                      className="opacity-70 hover:opacity-100"
                      aria-label={`Remove ${t}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={topics.length ? "Add another…" : "Type a topic and press Enter"}
                  className="flex-1 min-w-[160px] bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-foreground/40"
                />
              </div>

              {/* Suggestions */}
              <div className="mt-6">
                <p className="mb-3 text-xs uppercase tracking-[0.16em] text-foreground/45">Or pick from these</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED.filter((s) => !topics.some((t) => t.toLowerCase() === s.toLowerCase())).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addTopic(s)}
                      className="rounded-full border border-foreground/15 bg-background px-3 py-1.5 text-sm text-foreground/75 transition-colors hover:border-accent/50 hover:bg-accent/5 hover:text-accent"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <span className="text-sm text-foreground/55">
                  {topics.length} / 10 — minimum 3
                </span>
                <Button onClick={handleNext} size="lg" disabled={topics.length < 3}>
                  Continue
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">Delivery</p>
            <h1 className="mt-3 font-display text-4xl font-medium leading-tight tracking-tight md:text-5xl">
              When should it <em className="italic text-accent">land?</em>
            </h1>
            <p className="mt-4 text-foreground/65 leading-relaxed">
              Your briefing arrives once a day at the time you choose, in your local timezone.
            </p>

            <div className="mt-10 space-y-6 rounded-3xl border border-foreground/10 bg-card p-6 md:p-8">
              <div className="space-y-2">
                <Label htmlFor="name" className="px-2 text-xs text-foreground/60">Your name</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time" className="px-2 text-xs text-foreground/60">Delivery time</Label>
                <Input
                  id="time"
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                />
                <p className="px-2 text-xs text-foreground/50">Timezone detected: {timezone}</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  ← Back
                </Button>
                <Button onClick={handleFinish} size="lg" disabled={submitting}>
                  {submitting ? "Saving…" : "Finish setup"}
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
};

export default Onboarding;
