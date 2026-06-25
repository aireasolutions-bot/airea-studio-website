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
import { useC } from "@/content/ContentProvider";

export function Home() {
  const c = useC();
  const on = (k: string) => c(k) !== "false";
  return (
    <>
      <Hero />
      {on("section.home.stats") && <StatStrip />}
      {on("section.home.agent") && <TellTheAgent />}
      {on("section.home.onephoto") && <OnePhotoCampaign />}
      {on("section.home.film") && <ProductFilm />}
      {on("section.home.howitworks") && <HowItWorks />}
      {on("section.home.branddna") && <BrandDNA />}
      {on("section.home.channels") && <Channels />}
      {on("section.home.deploy") && <DeployEverywhere />}
      {on("section.home.wall") && <TheWall />}
      {on("section.home.usecases") && <UseCases />}
      {on("section.home.testimonials") && <Testimonials />}
      {on("section.home.pricing") && <PricingPreview />}
      <FinalCTA />
    </>
  );
}
