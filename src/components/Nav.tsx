import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const Nav = () => {
  return (
    <header className="w-full">
      <nav
        aria-label="Primary"
        className="container flex items-center justify-between py-5"
      >
        <Logo />

        <div className="hidden items-center gap-8 md:flex">
          <a href="#how" className="text-sm text-foreground/70 hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#faq" className="text-sm text-foreground/70 hover:text-foreground transition-colors">
            FAQ
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth">
              Get started
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
};

export default Nav;
