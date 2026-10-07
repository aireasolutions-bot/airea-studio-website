import { motion } from "framer-motion";
import { Seo } from "@/components/Seo";
import { breadcrumbSchema } from "@/lib/seo";

const EASE = [0.22, 0.61, 0.36, 1] as const;

const STORY_PARAGRAPHS = [
  "I’ve led marketing at large companies and worked with small businesses. No matter the size, the need to reach customers never stops.",
  "Your customers are on Facebook and Instagram, searching on Google, reading email, and visiting your website. You need to show up in all those places, but small businesses rarely have the creative team or time that a large company does.",
  "There had to be an easier way",
  "I’m a performance marketer at heart. I needed to test new messages, explore new channels and partnerships, and try new technologies to learn what drove results. All of that required creative assets.",
  "Our creative teams supported every part of the business, and there was always more work than time.",
  "Even updating existing creative could take a tremendous amount of work. At Banana Republic, we needed to remove a single word, “the,” from a campaign. It sounded simple.",
  "But that word appeared across hundreds of assets for different markets, stores, loyalty programs, and credit cards. The change needed to happen immediately and required a lot of people.",
  "I remember thinking: there has to be an easier way.",
  "The moment that got my attention",
  "Later, I met my co-founder Nick at Anatomie, a growing travel fashion company where he was the Director of Marketing. ChatGPT had just come out, and Nick kept telling me I needed to see what it could do.",
  "I was busy reviewing results, planning campaigns, and approving creative.",
  "Then he used it to write 30 product copy pages in about three hours. We had been quoted a month and thousands of dollars for that work.",
  "That got my attention.",
  "From one idea to a complete campaign",
  "At large companies, we thought in campaigns: one idea carried through every place a customer might see it. Small businesses often work one asset at a time. I wanted to make it possible to start with one idea and create a complete campaign across channels.",
  "We started with a tool that turned one campaign brief into copy for different channels, tailored to each platform, consistent with the brand’s voice, and relevant to the campaign.",
  "As we defined what the tool needed to do, we kept coming back to the same process: understand your customers, plan, create, launch, and learn.",
  "It applied to businesses of every size. The channels and technologies would keep changing, but the core process would remain.",
  "Making it possible for small businesses",
  "That became the foundation for AIREA Studio. We bring together AI models, your business context, and marketing expertise in one guided workflow.",
  "We handle the complexity of connecting those pieces, so small businesses can focus on their marketing. AIREA gives them more capacity to plan, create, launch, and learn, even when time and expertise are limited.",
  "AIREA is the tool I wish I’d had. My goal is to put that marketing expertise within reach of small businesses, so they can bring their ideas to life and do more with the resources they have.",
];

const TEAM = [
  {
    name: "Brian Tsung",
    role: "CEO",
    bio: "Brian has led marketing and digital commerce at Banana Republic, Gap Inc., and Frontgate, and worked on brands including West Elm and Pottery Barn Kids at Williams-Sonoma, Inc. His experience also includes a startup within Hallmark and advising growth strategy at Anatomie. A performance marketer at heart, he founded AIREA Studio to bring enterprise marketing expertise to small business owners and make it easier to turn one idea into a full campaign.",
  },
  {
    name: "Nicholas Santos",
    role: "CMO",
    bio: "Nick is a digital agency founder and small business owner with experience in advertising operations and customer acquisition. He and Brian began building AIREA after working together at Anatomie. Nick draws on that firsthand experience to shape new features using the latest large language models, focused on what small businesses need to create and improve their marketing.",
  },
  {
    name: "Akash Anand",
    role: "CPTO",
    bio: "Akash brings product leadership and hands-on AI experience from Meta, Prosper Marketplace, and Macy’s.com. At AIREA, he leads the technology and product work behind turning a business owner’s idea into marketing they can review, refine, and use.",
  },
  {
    name: "Annie Deihl",
    role: "Product and Growth",
    bio: "Annie has spent more than 20 years building digital products and experiences for ecommerce, fintech and enterprise software at companies like Cash App, Block, Snapfish, RedEnvelope, HP, and Oracle. At AIREA, she focuses on making a sophisticated marketing process feel intuitive and useful for the people doing the work.",
  },
  {
    name: "Matt Thompson",
    role: "Growth Marketing",
    bio: "Matt has more than 15 years of experience growing customer acquisition for subscription and direct-to-consumer brands. At AIREA, he brings a performance marketer’s perspective to how we reach customers, test what works, and make the platform more useful to growing businesses.",
  },
  {
    name: "Campbell Tsung",
    role: "Creative Lead",
    bio: "Campbell brings a background in media design, brand storytelling, social media, and visual content. At AIREA, Campbell helps shape the creative experience so the work customers make feels true to their brand and ready for the channels where it will appear.",
  },
  {
    name: "David Hsiao",
    role: "Engineering Intern",
    bio: "David is pursuing a master’s degree in computer science and helping build the next generation of AIREA Studio. His work focuses on making AI-created marketing easy to refine and put into action, so customers can move quickly while keeping their own judgment and brand at the center.",
  },
];

function AboutHero() {
  return (
    <section className="relative overflow-hidden pb-14 pt-32 md:pb-20 md:pt-40">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-blue-radial" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.3] [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
      <div className="wrap-wide">
        <motion.div
          className="mx-auto max-w-4xl text-center"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-blue">About AIREA Studio</p>
          <h1 className="mt-5 font-display text-[clamp(44px,7vw,86px)] leading-[0.96] tracking-[-0.025em] text-ink">
            Our founder <span className="italic-blue">story</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[clamp(17px,1.7vw,21px)] leading-8 text-ink-2">
            AIREA Studio was built from a simple belief: small businesses should be able to easily turn one idea into a full campaign - with the knowledge, speed, and consistency of an experienced marketing team.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function FounderStory() {
  return (
    <section className="py-12 md:py-20">
      <div className="wrap-wide">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.34fr_0.66fr] lg:items-start">
          <aside className="lg:sticky lg:top-28">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-ink-3">Founder story</p>
            <h2 className="mt-4 font-display text-[clamp(32px,4vw,54px)] leading-[1.03] tracking-[-0.015em] text-ink">
              Why we built AIREA.
            </h2>
          </aside>

          <article className="rounded-5xl border border-line bg-white p-6 shadow-soft md:p-10 lg:p-12">
            <div className="space-y-6 text-[18px] leading-8 text-ink-2 md:text-[19px] md:leading-9">
              {STORY_PARAGRAPHS.slice(0, -1).map((paragraph) => (
                <p key={paragraph} className={paragraph === "There had to be an easier way" || paragraph === "The moment that got my attention" || paragraph === "From one idea to a complete campaign" || paragraph === "Making it possible for small businesses" ? "font-bold" : undefined}>{paragraph}</p>
              ))}
            </div>
            <blockquote className="mt-10 rounded-4xl border border-line bg-blue-mist p-6 md:p-8">
              <p className="font-display text-[clamp(28px,3.3vw,42px)] leading-tight tracking-[-0.015em] text-ink">
                {STORY_PARAGRAPHS[STORY_PARAGRAPHS.length - 1]}
              </p>
            </blockquote>
          </article>
        </div>
      </div>
    </section>
  );
}

function TeamBios() {
  return (
    <section className="border-t border-line bg-paper py-20 md:py-28">
      <div className="wrap-wide">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-ink-3">Team bios</p>
          <h2 className="mt-4 font-display text-[clamp(36px,5vw,64px)] leading-[1.02] tracking-[-0.02em] text-ink">
            Meet the team behind AIREA.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((member, index) => (
            <motion.article
              key={member.name}
              className="rounded-4xl border border-line bg-white p-6 shadow-soft md:p-7"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, ease: EASE, delay: Math.min(index * 0.04, 0.2) }}
            >
              <div className="flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <h3 className="text-[22px] font-semibold tracking-tight text-ink">
                  {member.name === "Brian Tsung" ? (
                    <a href="https://www.linkedin.com/in/brian-tsung/" target="_blank" rel="noreferrer">
                      {member.name}
                    </a>
                  ) : member.name === "Nicholas Santos" ? (
                    <a href="https://linkedin.com/in/nicolas-santos-bragg-659182aa/?skipRedirect=true" target="_blank" rel="noreferrer">
                      {member.name}
                    </a>
                  ) : member.name === "Akash Anand" ? (
                    <a href="https://www.linkedin.com/in/akashanand1/" target="_blank" rel="noreferrer">
                      {member.name}
                    </a>
                  ) : member.name === "Annie Deihl" ? (
                    <a href="https://www.linkedin.com/in/anniedeihl/" target="_blank" rel="noreferrer">
                      {member.name}
                    </a>
                  ) : member.name === "Matt Thompson" ? (
                    <a href="https://www.linkedin.com/in/mattthompson85/" target="_blank" rel="noreferrer">
                      {member.name}
                    </a>
                  ) : member.name === "David Hsiao" ? (
                    <a href="https://www.linkedin.com/in/davidwhsiao/" target="_blank" rel="noreferrer">
                      {member.name}
                    </a>
                  ) : (
                    member.name
                  )}
                </h3>
                <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-blue">{member.role}</p>
              </div>
              <p className="mt-5 text-[15.5px] leading-7 text-ink-2">{member.bio}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function About() {
  return (
    <>
      <Seo
        path="/about"
        title="About AIREA Studio | Founder Story & Team"
        description="Read the founder story behind AIREA Studio and meet the team building AI-powered campaign tools for small businesses."
        jsonLd={[breadcrumbSchema([{ name: "Home", path: "/" }, { name: "About us", path: "/about" }])]}
      />
      <AboutHero />
      <FounderStory />
      <TeamBios />
    </>
  );
}
