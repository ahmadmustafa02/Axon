import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { TrendingUp, Activity, MinusCircle, X } from "lucide-react";

export type VelocityFilter = "all" | "rising" | "steady" | "slowing";

interface Props {
  topics: string[];
  selectedTopic: string | null;
  onTopicChange: (t: string | null) => void;
  velocity: VelocityFilter;
  onVelocityChange: (v: VelocityFilter) => void;
  minScore: number;
  onMinScoreChange: (n: number) => void;
  totalCount: number;
  filteredCount: number;
}

const velocityOptions: { value: VelocityFilter; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All", icon: null },
  { value: "rising", label: "Rising", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { value: "steady", label: "Steady", icon: <Activity className="h-3.5 w-3.5" /> },
  { value: "slowing", label: "Slowing", icon: <MinusCircle className="h-3.5 w-3.5" /> },
];

const FeedFilters = ({
  topics,
  selectedTopic,
  onTopicChange,
  velocity,
  onVelocityChange,
  minScore,
  onMinScoreChange,
  totalCount,
  filteredCount,
}: Props) => {
  const hasActive = selectedTopic !== null || velocity !== "all" || minScore > 0;

  const reset = () => {
    onTopicChange(null);
    onVelocityChange("all");
    onMinScoreChange(0);
  };

  return (
    <div className="mt-6 rounded-3xl border border-foreground/10 bg-card/60 p-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        {/* Topics */}
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-foreground/50">Topic</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              onClick={() => onTopicChange(null)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                selectedTopic === null
                  ? "bg-foreground text-background"
                  : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
              }`}
            >
              All
            </button>
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => onTopicChange(t === selectedTopic ? null : t)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  selectedTopic === t
                    ? "bg-accent text-accent-foreground"
                    : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Velocity */}
        <div className="md:w-48">
          <p className="text-xs uppercase tracking-wider text-foreground/50">Velocity</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {velocityOptions.map((v) => (
              <button
                key={v.value}
                onClick={() => onVelocityChange(v.value)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${
                  velocity === v.value
                    ? "bg-accent text-accent-foreground"
                    : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
                }`}
              >
                {v.icon}
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Min score */}
        <div className="md:w-56">
          <div className="flex items-baseline justify-between">
            <p className="text-xs uppercase tracking-wider text-foreground/50">Min score</p>
            <span className="text-xs text-accent font-medium">{minScore}</span>
          </div>
          <Slider
            value={[minScore]}
            min={0}
            max={100}
            step={5}
            onValueChange={(v) => onMinScoreChange(v[0])}
            className="mt-3"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-foreground/5 pt-3">
        <p className="text-xs text-foreground/50">
          Showing <span className="text-foreground/80 font-medium">{filteredCount}</span> of {totalCount}
        </p>
        {hasActive && (
          <Button variant="ghost" size="sm" onClick={reset} className="h-7 gap-1 text-xs">
            <X className="h-3 w-3" /> Clear filters
          </Button>
        )}
      </div>
    </div>
  );
};

export default FeedFilters;
