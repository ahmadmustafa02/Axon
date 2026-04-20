import Logo from "@/components/Logo";

const Footer = () => {
  return (
    <footer className="border-t border-foreground/10">
      <div className="container flex flex-col items-start justify-between gap-6 py-10 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-sm text-foreground/55">— signal before the noise</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground/55">
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          <span className="text-foreground/40">© {new Date().getFullYear()} Axon</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
