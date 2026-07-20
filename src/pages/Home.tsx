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
import { PageSections } from "@/components/PageSections";
import { Seo } from "@/components/Seo";
import { faqSchema } from "@/lib/seo";
import { FAQ } from "@/lib/site";

export function Home() {
  return (
    <>
      <Seo path="/" jsonLd={[faqSchema(FAQ)]} />
      <PageSections
        page="home"
        sections={{
          hero: <Hero />,
          stats: <StatStrip />,
          agent: <TellTheAgent />,
          onephoto: <OnePhotoCampaign />,
          film: <ProductFilm />,
          howitworks: <HowItWorks />,
          branddna: <BrandDNA />,
          channels: <Channels />,
          deploy: <DeployEverywhere />,
          wall: <TheWall />,
          usecases: <UseCases />,
          testimonials: <Testimonials />,
          pricing: <PricingPreview />,
          cta: <FinalCTA />,
        }}
      />
    </>
  );
}
