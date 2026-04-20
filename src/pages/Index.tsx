import Nav from "@/components/Nav";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import FAQ from "@/components/landing/FAQ";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <HowItWorks />
      <FAQ />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
