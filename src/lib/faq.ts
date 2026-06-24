export type FaqItem = { q: string; a: string[] };
export type FaqCategory = { id: string; title: string; items: FaqItem[] };

export const FAQ_HEADER = {
  eyebrow: "The Chief Marketing Agent for small businesses",
  title: "Questions, answered.",
  intro:
    "AIREA Studio is an AI-powered, multi-channel marketing platform built for small business owners who want professional marketing — copy and visuals — without needing marketing experience.",
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "right-for-me",
    title: "Is AIREA Studio right for my small business?",
    items: [
      {
        q: "Is AIREA Studio easy to use for small business owners?",
        a: [
          "Yes. If you can send a text or write an email, you can use AIREA Studio.",
          "The AIREA Agent guides you step-by-step. You provide simple direction — a rough idea or a goal — and the platform handles the campaign structure, copywriting, image generation, formatting, and execution for you.",
        ],
      },
      {
        q: "Can AIREA Studio help small businesses with marketing?",
        a: [
          "Yes. AIREA Studio is designed to turn everyday ideas into professional, high-performing marketing campaigns.",
          "Your campaigns automatically follow industry best practices: clear messaging, custom visual assets, the right formats for each channel (social, email, ads), and a cohesive look and feel — without you managing the technical details.",
        ],
      },
      {
        q: "Who is AIREA Studio designed for?",
        a: [
          "AIREA Studio is purpose-built for small business owners, solo operators, and small teams.",
          "It's ideal for businesses that need to share updates across Instagram, Facebook, and email, or run ads on Google, but want a faster, simpler way to handle both design and writing in one place.",
        ],
      },
    ],
  },
  {
    id: "how-it-works",
    title: "How AIREA Studio works",
    items: [
      {
        q: "What does AIREA Studio do for small business marketing?",
        a: [
          "AIREA Studio acts as your Chief Marketing Agent — helping you plan, create, analyze, and launch marketing across multiple channels through a single, guided workflow, including simplified publishing to your selected platforms.",
          "Unlike standard AI tools, AIREA Studio learns your brand voice and visual identity. It shapes your campaign direction, generates high-quality images, creates on-brand copy, and adapts assets for each specific platform.",
        ],
      },
      {
        q: "Is AIREA Studio an all-in-one AI marketing platform?",
        a: [
          "Yes. AIREA Studio combines strategy, copywriting, visual creation, and publishing into one platform built specifically for small businesses.",
          "Instead of juggling separate tools for writing, design, resizing, performance tracking, and channel formatting, AIREA Studio brings everything together in one guided workflow — from idea to launch.",
        ],
      },
      {
        q: "Do I need marketing experience or AI prompts to use it?",
        a: [
          "No. You don't need to know marketing jargon or how to write AI prompts.",
          "Describe what you want in plain terms, or choose from guided options. AIREA Studio handles the prompts in the background and structures both the copy and imagery correctly for each platform — the way an experienced marketing team would.",
        ],
      },
      {
        q: "Do I have control over what gets published?",
        a: [
          "Yes. You are always in control.",
          "Nothing is deployed without your explicit review. You can edit text, regenerate images, swap visuals, or refine details before giving final approval to go live.",
        ],
      },
    ],
  },
  {
    id: "content-channels",
    title: "Content, quality, and channels",
    items: [
      {
        q: "Does AIREA Studio generate images for my campaigns?",
        a: [
          "Yes. You don't need a separate designer or stock-photo subscription.",
          "AIREA Studio includes powerful AI image generation. It creates custom, high-quality images tailored to your specific campaign topic and brand style, instantly.",
        ],
      },
      {
        q: "Will AIREA Studio create on-brand marketing content?",
        a: [
          "Yes. AIREA Studio creates a unique Brand DNA profile for your business.",
          "This profile stores your brand voice, visual identity, and style preferences. The system applies this DNA to every piece of copy and every image it generates — so you sound and look consistent across every channel.",
        ],
      },
      {
        q: "What types of marketing content can I create?",
        a: [
          "You can create assets for a wide variety of channels:",
          "Social Media — Facebook, Instagram.",
          "Paid Advertising — Google Ads, Social Ads.",
          "Direct Marketing — Email campaigns and newsletters.",
        ],
      },
      {
        q: "Is AIREA Studio a multi-channel marketing platform?",
        a: [
          "Yes. Instead of creating one post for Instagram and then manually resizing images and rewriting text for email or Google, AIREA Studio automatically adapts your message and reformats your visuals to fit the requirements of every channel you select.",
        ],
      },
      {
        q: "Can I use my own images and brand assets?",
        a: [
          "Yes. You have full flexibility. Upload your own photography, logos, or reference visuals — or let AIREA Studio generate new original imagery for you.",
        ],
      },
    ],
  },
  {
    id: "mobile",
    title: "Mobile and day-to-day use",
    items: [
      {
        q: "Can I use AIREA Studio on mobile and desktop?",
        a: [
          "Yes. AIREA Studio offers a seamless experience across devices.",
          "Capture an idea or start a campaign from your phone the moment inspiration strikes, then switch to desktop for a larger view to refine visuals, review copy, or schedule your launch.",
        ],
      },
      {
        q: "Is AIREA Studio for local and online small businesses?",
        a: [
          "Yes. It works for both physical brick-and-mortar stores and digital-first businesses.",
          "Whether you run a local storefront, a service-based business, or an e-commerce brand, AIREA Studio adapts to your business model and how you reach your local or global customers.",
        ],
      },
    ],
  },
  {
    id: "tokens",
    title: "Tokens and usage",
    items: [
      {
        q: "What are tokens in AIREA Studio?",
        a: [
          "Tokens are how usage is measured in AIREA Studio.",
          "They represent the work the platform does for you — creating copy, generating or refining images, adapting content for different channels, and making revisions.",
        ],
      },
      {
        q: "Why does AIREA Studio use tokens?",
        a: [
          "Marketing work isn't one-size-fits-all.",
          "A short post uses fewer resources than a full multi-channel campaign with images and edits. Tokens keep pricing fair and flexible based on what you actually create.",
        ],
      },
      {
        q: "What actions use tokens?",
        a: [
          "Tokens are used when you generate campaign copy, create or edit images, adapt content for multiple channels, or refine outputs.",
          "Viewing, browsing, and managing campaigns do not use tokens.",
        ],
      },
      {
        q: "Do tokens reset each month?",
        a: [
          "Yes. Tokens refresh monthly based on your plan.",
          "Unused tokens don't roll over, which keeps plans simple and predictable.",
        ],
      },
      {
        q: "What happens if I run out of tokens?",
        a: [
          "You can upgrade your plan or wait for your next monthly refresh. We're also working on giving you the ability to purchase additional tokens.",
        ],
      },
      {
        q: "Can I see my token usage?",
        a: ["Yes. Token usage is always visible in your dashboard."],
      },
      {
        q: "Are tokens shared across my team?",
        a: [
          "Yes. Tokens are shared across your workspace.",
          "This makes it easy for teams to collaborate without managing individual limits.",
        ],
      },
      {
        q: "Do tokens affect content quality?",
        a: [
          "No. Token limits affect how much you create, not how good it is.",
          "AIREA Studio maintains the same quality standards across all plans.",
        ],
      },
      {
        q: "What's the simplest way to understand tokens?",
        a: [
          "Think of tokens like an electric car's battery. Short trips by yourself, going downhill, use less power. Longer trips with a full car, uphill, towing a trailer, use more.",
          "In AIREA Studio, a single campaign with limited images and edits uses fewer tokens, while multi-channel campaigns with multiple images and revisions use more.",
        ],
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy and data",
    items: [
      {
        q: "Is my business data private?",
        a: [
          "Yes. Your brand information, campaigns, and content stay private to your account and workspace.",
        ],
      },
      {
        q: "Do I own the content I upload or create?",
        a: [
          "Yes. You retain full ownership of everything you upload or create in AIREA Studio, including generated marketing content.",
        ],
      },
      {
        q: "Are my prompts or inputs stored?",
        a: [
          "No. Prompts are processed in real time to create content and are not stored after your session ends.",
        ],
      },
      {
        q: "Is my data used to train public or third-party AI models?",
        a: [
          "No. Your content is never used to train public or third-party AI systems.",
          "Any platform improvements use aggregated and anonymized data only.",
        ],
      },
      {
        q: "Who does AIREA Studio share data with?",
        a: [
          "Only trusted service providers needed to operate the platform — such as hosting, payments, analytics, and secure AI infrastructure. Data is never sold or shared for advertising.",
        ],
      },
      {
        q: "Where can I find full details?",
        a: ["You can review full information in our Privacy Policy page."],
      },
    ],
  },
  {
    id: "pricing",
    title: "Pricing, trials, and commitment",
    items: [
      {
        q: "Is there a free trial?",
        a: ["Yes. You can try AIREA Studio before committing."],
      },
      {
        q: "Am I locked into a long-term contract?",
        a: ["No. Plans are flexible, and you can change or cancel at any time."],
      },
    ],
  },
  {
    id: "compare",
    title: "Comparing AIREA Studio to other options",
    items: [
      {
        q: "How is AIREA Studio different from other AI marketing tools?",
        a: [
          "Unlike generic content generators (like ChatGPT or Jasper) that only write text or just generate images, AIREA Studio is a comprehensive Chief Marketing Agent.",
          "It combines strategy, copywriting, and image design into one flow. It guides your strategy, enforces brand consistency, and automatically formats content for multi-channel distribution.",
        ],
      },
      {
        q: "Can AIREA Studio replace a marketing agency?",
        a: [
          "For day-to-day execution, yes. It provides professional-grade output without the high retainer costs or turnaround delays of traditional agencies or freelancers.",
        ],
      },
      {
        q: "How fast can I launch a marketing campaign?",
        a: [
          "Most users can create and review a campaign in minutes instead of days.",
          "The platform removes setup friction and handles formatting automatically.",
        ],
      },
    ],
  },
];
