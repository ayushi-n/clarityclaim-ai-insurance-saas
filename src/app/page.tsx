import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LiveDemo } from "@/components/landing/LiveDemo";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import { ClosingCTA, Footer } from "@/components/landing/CTA";

export default function LandingPage() {
  return (
    <main className="bg-clarity-100">
      <Navbar />
      <Hero />
      <HowItWorks />
      <LiveDemo />
      <Features />
      <Pricing />
      <ClosingCTA />
      <Footer />
    </main>
  );
}
