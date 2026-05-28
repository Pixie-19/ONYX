'use client';

import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { HowItWorksSection } from './HowItWorksSection';
import { IntelligenceSection } from './IntelligenceSection';
import { ReplaySection } from './ReplaySection';
import { BlackoutSection } from './BlackoutSection';
import { WorkspaceSection } from './WorkspaceSection';
import { CtaSection } from './CtaSection';
import { Footer } from './Footer';

export function LandingPage() {
  return (
    <div className="w-full h-full overflow-y-auto overflow-x-hidden bg-surface-base">
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <IntelligenceSection />
      <ReplaySection />
      <BlackoutSection />
      <WorkspaceSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
