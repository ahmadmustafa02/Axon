import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Logo from "@/components/Logo";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // Sign in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sign up state
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suName, setSuName] = useState("");

  useEffect(() => {
    if (user) {
      // Route post-login through dashboard which will bounce to onboarding if needed
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-2 w-2 animate-pulse-dot rounded-full bg-accent" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back.");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const redirectUrl = `${window.location.origin}/onboarding`;
    const { error } = await supabase.auth.signUp({
      email: suEmail,
      password: suPassword,
      options: {
        emailRedirectTo: redirectUrl,
        data: { display_name: suName || suEmail.split("@")[0] },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created. Let's set up your briefing.");
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="container flex items-center justify-between py-5">
        <Logo />
        <Link to="/" className="text-sm text-foreground/60 hover:text-foreground transition-colors">
          ← Back home
        </Link>
      </header>

      <section className="container grid place-items-center pb-20 pt-10 md:pt-20">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <p className="eyebrow">{tab === "signin" ? "Welcome back" : "Get started"}</p>
            <h1 className="mt-3 font-display text-4xl font-medium leading-tight tracking-tight md:text-5xl">
              {tab === "signin" ? (
                <>
                  Tune in to your <em className="italic text-accent">signal.</em>
                </>
              ) : (
                <>
                  Set up your <em className="italic text-accent">briefing.</em>
                </>
              )}
            </h1>
          </div>

          <div className="rounded-3xl border border-foreground/10 bg-card p-6 md:p-8 shadow-[0_20px_60px_-30px_hsl(var(--accent)/0.25)]">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2 rounded-full bg-secondary/60 p-1">
                <TabsTrigger value="signin" className="rounded-full">Sign in</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="si-email" className="px-2 text-xs text-foreground/60">Email</Label>
                    <Input
                      id="si-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-password" className="px-2 text-xs text-foreground/60">Password</Label>
                    <Input
                      id="si-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                    {submitting ? "Signing in…" : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="su-name" className="px-2 text-xs text-foreground/60">Name</Label>
                    <Input
                      id="su-name"
                      type="text"
                      autoComplete="name"
                      value={suName}
                      onChange={(e) => setSuName(e.target.value)}
                      placeholder="Sarah Chen"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email" className="px-2 text-xs text-foreground/60">Email</Label>
                    <Input
                      id="su-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={suEmail}
                      onChange={(e) => setSuEmail(e.target.value)}
                      placeholder="you@domain.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-password" className="px-2 text-xs text-foreground/60">Password</Label>
                    <Input
                      id="su-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={suPassword}
                      onChange={(e) => setSuPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                    {submitting ? "Creating account…" : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <p className="mt-6 text-center text-xs text-foreground/50">
            By continuing you agree that Axon may scan public sources to build your briefing.
          </p>
        </div>
      </section>
    </main>
  );
};

export default Auth;
