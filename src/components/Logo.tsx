import { Link } from "react-router-dom";

const Logo = ({ className = "" }: { className?: string }) => (
  <Link to="/" className={`inline-flex items-center gap-2 ${className}`} aria-label="Axon home">
    <span className="relative inline-block">
      <span className="font-display text-[24px] font-medium leading-none tracking-tight text-foreground">Axon</span>
      <span className="absolute -right-2.5 top-1.5 h-2 w-2 rounded-full bg-accent" aria-hidden />
    </span>
  </Link>
);

export default Logo;
