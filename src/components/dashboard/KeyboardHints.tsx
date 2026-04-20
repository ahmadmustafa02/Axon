const Key = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded-md border border-foreground/15 bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground/70 shadow-sm">
    {children}
  </kbd>
);

const KeyboardHints = () => (
  <div className="mt-6 hidden flex-wrap items-center gap-x-4 gap-y-2 text-xs text-foreground/45 md:flex">
    <span className="flex items-center gap-1.5">
      <Key>R</Key> run pipeline
    </span>
    <span className="flex items-center gap-1.5">
      <Key>B</Key> today's briefing
    </span>
    <span className="flex items-center gap-1.5">
      <Key>A</Key> archive
    </span>
    <span className="flex items-center gap-1.5">
      <Key>F</Key> focus filters
    </span>
    <span className="flex items-center gap-1.5">
      <Key>C</Key> clear filters
    </span>
    <span className="flex items-center gap-1.5">
      <Key>?</Key> help
    </span>
  </div>
);

export default KeyboardHints;
