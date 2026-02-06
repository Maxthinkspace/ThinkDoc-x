import Header from "@/components/Header";
import TechHero from "@/components/TechHero";
import TechProblemSection from "@/components/TechProblemSection";
import LocalSecuritySection from "@/components/LocalSecuritySection";
import TechSolutionSection from "@/components/TechSolutionSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import TechCTA from "@/components/TechCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <TechHero />
        <TechProblemSection />
        <LocalSecuritySection />
        <TechSolutionSection />
        <HowItWorksSection />
        <TechCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

