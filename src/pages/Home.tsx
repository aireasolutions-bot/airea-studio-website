import { Hero } from "@/sections/Hero";
import { StatStrip } from "@/sections/StatStrip";
import { TellTheAgent } from "@/sections/TellTheAgent";
import { OnePhotoCampaign } from "@/sections/OnePhotoCampaign";
import { ProductFilm } from "@/sections/ProductFilm";
import { HowItWorks } from "@/sections/HowItWorks";
import { BrandDNA } from "@/sections/BrandDNA";
import { Channels } from "@/sections/Channels";
import { DeployEverywhere } from "@/sections/DeployEverywhere";
import { TheWall } from "@/sections/TheWall";
import { UseCases } from "@/sections/UseCases";
import { Testimonials } from "@/sections/Testimonials";
import { PricingPreview } from "@/sections/PricingPreview";
import { FinalCTA } from "@/sections/FinalCTA";

export function Home() {
  return (
    <>
      <Hero />
      <StatStrip />
      <TellTheAgent />
      <OnePhotoCampaign />
      <ProductFilm />
      <HowItWorks />
      <BrandDNA />
      <Channels />
      <DeployEverywhere />
      <TheWall />
      <UseCases />
      <Testimonials />
      <PricingPreview />
      <FinalCTA />
    </>
  );
}
