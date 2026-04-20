import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  articleId?: string;
  briefingId?: string;
  size?: "sm" | "md";
}

const reasonSchema = z
  .string()
  .trim()
  .max(500, { message: "Reason must be under 500 characters" });

const FeedbackButtons = ({ articleId, briefingId, size = "sm" }: Props) => {
  const { user } = useAuth();
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [loading, setLoading] = useState<"up" | "down" | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const iconSize = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const btnSize = size === "md" ? "h-9 w-9" : "h-8 w-8";

  // Load existing feedback
  useEffect(() => {
    if (!user || (!articleId && !briefingId)) return;
    let q = supabase.from("feedback").select("rating, reason").eq("user_id", user.id);
    if (articleId) q = q.eq("article_id", articleId);
    if (briefingId) q = q.eq("briefing_id", briefingId);
    q.maybeSingle().then(({ data }) => {
      if (data) {
        setRating((data.rating as 1 | -1) ?? null);
        setReason(data.reason ?? "");
      }
    });
  }, [user, articleId, briefingId]);

  const upsert = async (newRating: 1 | -1, newReason: string | null) => {
    if (!user) {
      toast.error("Sign in to leave feedback.");
      return false;
    }
    // Delete existing for this target then insert (no unique constraint)
    let del = supabase.from("feedback").delete().eq("user_id", user.id);
    if (articleId) del = del.eq("article_id", articleId);
    if (briefingId) del = del.eq("briefing_id", briefingId);
    await del;

    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      article_id: articleId ?? null,
      briefing_id: briefingId ?? null,
      rating: newRating,
      reason: newReason,
    });
    if (error) {
      toast.error(error.message);
      return false;
    }
    return true;
  };

  const handleUp = async () => {
    if (loading) return;
    setLoading("up");
    const ok = await upsert(1, null);
    setLoading(null);
    if (ok) {
      setRating(1);
      setReason("");
      toast.success("Thanks — noted.");
    }
  };

  const handleDown = async () => {
    if (loading) return;
    setLoading("down");
    const ok = await upsert(-1, null);
    setLoading(null);
    if (ok) {
      setRating(-1);
      setOpen(true);
    }
  };

  const submitReason = async () => {
    const parsed = reasonSchema.safeParse(reason);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading("down");
    const ok = await upsert(-1, parsed.data || null);
    setLoading(null);
    if (ok) {
      setOpen(false);
      toast.success("Feedback saved.");
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handleUp}
        disabled={loading !== null}
        aria-label="Mark as relevant"
        className={cn(
          "inline-flex items-center justify-center rounded-full border transition-colors",
          btnSize,
          rating === 1
            ? "border-accent/50 bg-accent/15 text-accent"
            : "border-foreground/10 text-foreground/50 hover:border-accent/40 hover:text-accent",
        )}
      >
        {loading === "up" ? <Loader2 className={cn(iconSize, "animate-spin")} /> : <ThumbsUp className={iconSize} />}
      </button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={handleDown}
            disabled={loading !== null}
            aria-label="Mark as irrelevant"
            className={cn(
              "inline-flex items-center justify-center rounded-full border transition-colors",
              btnSize,
              rating === -1
                ? "border-destructive/50 bg-destructive/15 text-destructive"
                : "border-foreground/10 text-foreground/50 hover:border-destructive/40 hover:text-destructive",
            )}
          >
            {loading === "down" ? <Loader2 className={cn(iconSize, "animate-spin")} /> : <ThumbsDown className={iconSize} />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <p className="text-sm font-medium">Why isn't this relevant?</p>
          <p className="mt-1 text-xs text-foreground/55">Optional — helps tune your feed.</p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Off-topic, too basic, already saw it…"
            maxLength={500}
            className="mt-3 min-h-[80px] resize-none text-sm"
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Skip
            </Button>
            <Button size="sm" onClick={submitReason} disabled={loading !== null}>
              {loading === "down" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default FeedbackButtons;
