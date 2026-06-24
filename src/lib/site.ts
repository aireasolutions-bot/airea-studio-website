/* Content backbone for the AIREA Studio site.
   Voice: educational, confident, specific. No hype words. */

export const SITE = {
  name: "AIREA Studio",
  domain: "aireastudio.ai",
  tagline: "The AI marketing OS",
  trialCta: "Start 14-day free trial",
  trialNote: "No credit card required · Cancel anytime",
};

export type NavLink = { label: string; to: string };

export const NAV: NavLink[] = [
  { label: "How it works", to: "/#how" },
  { label: "Product", to: "/#wall" },
  { label: "Pricing", to: "/pricing" },
];

export const SOLUTIONS: { label: string; to: string; desc: string }[] = [
  { label: "Small business", to: "/small-business", desc: "Punch above your weight, solo." },
  { label: "E-commerce", to: "/ecommerce", desc: "One product photo → every ad." },
];

export const HERO = {
  eyebrow: "The AI marketing OS",
  line1: "One source in.",
  line2a: "A ",
  line2b: "full campaign",
  line2c: " out.",
  sub: "AIREA Studio learns your brand, then plans, designs, and ships on-brand campaigns across every channel — in minutes, not weeks. Ship like a 30-person team with the headcount of three.",
};

export const PLATFORMS = [
  { name: "Meta", src: "/assets/platforms/meta.png" },
  { name: "Facebook", src: "/assets/platforms/facebook.png" },
  { name: "Instagram", src: "/assets/platforms/instagram.png" },
  { name: "Google Ads", src: "/assets/platforms/google.png" },
];

export const STATS = [
  { value: 9, suffix: "+", label: "channels from one source" },
  { value: 90, suffix: "s", label: "from brief to first draft" },
  { value: 14, suffix: " days", label: "free — no card" },
  { value: 100, suffix: "%", label: "on your Brand DNA" },
];

export type Step = {
  n: string;
  key: string;
  title: string;
  body: string;
  image: string;
  accent?: string;
};

export const STEPS: Step[] = [
  {
    n: "01",
    key: "brand-dna",
    title: "Train your Brand DNA",
    body: "Point Studio at your website or drop in your assets. It learns your voice, colors, products, and offers in minutes — so everything that follows sounds like you.",
    image: "/assets/product/brand-dna-url.png",
  },
  {
    n: "02",
    key: "campaign",
    title: "Brief a campaign",
    body: "Describe the goal — or just name it. Studio brainstorms angles, structures the campaign, and drafts the plan with you in the loop.",
    image: "/assets/product/campaign-name.png",
  },
  {
    n: "03",
    key: "channels",
    title: "Pick your channels",
    body: "Social, paid, email, blog. Studio adapts the message, format, and ratio for each platform automatically — Meta, Instagram, Google and more.",
    image: "/assets/product/media-meta.png",
  },
  {
    n: "04",
    key: "creative",
    title: "Set the creative direction",
    body: "Upload inspiration or let Studio propose directions. Approve a look and it carries through every asset, on brand, every time.",
    image: "/assets/product/creative-direction.png",
  },
  {
    n: "05",
    key: "review",
    title: "Review & edit with AI",
    body: "Refine copy and visuals with a single prompt. Swap an image, tighten a headline, change the offer — without leaving the canvas.",
    image: "/assets/product/review-edit-image.png",
  },
  {
    n: "06",
    key: "deploy",
    title: "Deploy everywhere",
    body: "One click to Facebook and Instagram, with channel-ready exports for Google, Meta, email, and the web. Schedule it or ship it now.",
    image: "/assets/product/deploy.png",
  },
];

export const CHANNELS = [
  {
    title: "Social media",
    body: "On-brand posts and stories for Instagram & Facebook, sized and scheduled.",
    tag: "Organic",
  },
  {
    title: "Paid ads",
    body: "Conversion-ready creative and copy for Meta and Google, in every required ratio.",
    tag: "Performance",
  },
  {
    title: "Email marketing",
    body: "Campaigns and auto-triggers written in your voice, ready to send.",
    tag: "Lifecycle",
  },
  {
    title: "Web & blog",
    body: "SEO-aware long-form and landing copy that matches the rest of the campaign.",
    tag: "Owned",
  },
];

export const RATIOS = [
  { label: "1:1 · Feed", src: "/assets/campaigns/ratio-linkedin.jpg", ar: "1 / 1" },
  { label: "4:5 · IG", src: "/assets/campaigns/ratio-feed.jpg", ar: "4 / 5" },
  { label: "9:16 · Story", src: "/assets/campaigns/ratio-story.jpg", ar: "9 / 16" },
  { label: "16:9 · YouTube", src: "/assets/campaigns/ratio-youtube.jpg", ar: "16 / 9" },
];

export type UseCase = {
  title: string;
  body: string;
  points: string[];
};

export const USE_CASES: UseCase[] = [
  {
    title: "Local businesses",
    body: "Look like a national brand on a neighborhood budget.",
    points: ["Storefront to social in minutes", "Seasonal campaigns on autopilot", "One brand voice everywhere"],
  },
  {
    title: "Service providers",
    body: "Win attention while you do the actual work.",
    points: ["Lead-gen ads that convert", "Email follow-up, written for you", "Booked out, not burned out"],
  },
  {
    title: "Solo & founders",
    body: "A full marketing team in your pocket.",
    points: ["No agency, no hires", "Best practices built in", "Ship daily, stay consistent"],
  },
  {
    title: "E-commerce",
    body: "One product photo becomes a full funnel.",
    points: ["Every ad ratio, instantly", "Catalog-scale creative", "On-brand across channels"],
  },
];

export type Plan = {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  cta: string;
  featured?: boolean;
};

export const PLANS: Plan[] = [
  {
    name: "Starter",
    price: "$39",
    cadence: "/mo",
    blurb: "For solo operators getting consistent.",
    features: ["1 brand workspace", "Up to 30 campaigns / mo", "Social + email channels", "Brand DNA training"],
    cta: "Start free",
  },
  {
    name: "Studio",
    price: "$99",
    cadence: "/mo",
    blurb: "For small teams shipping every week.",
    features: ["3 brand workspaces", "Unlimited campaigns", "All channels incl. paid ads", "AI review & editing", "1-click publish to Meta"],
    cta: "Start free",
    featured: true,
  },
  {
    name: "Scale",
    price: "$249",
    cadence: "/mo",
    blurb: "For growing marketing teams.",
    features: ["10 workspaces & seats", "The Wall analytics", "Priority models", "Roles & permissions", "Shared brand library"],
    cta: "Start free",
  },
];

export const TESTIMONIALS = [
  {
    quote:
      "We went from a 9-day creative cycle to same-day. The work actually looks like us — that was the part I didn't believe until I saw it.",
    name: "Head of Growth",
    role: "Series B fintech",
  },
  {
    quote:
      "I run my whole shop alone. Studio is the marketing hire I couldn't afford — campaigns go out daily and they're on brand.",
    name: "Founder",
    role: "DTC home goods",
  },
  {
    quote:
      "One product shoot now fuels every channel. The ratio and copy adaptation alone saves us a full retainer.",
    name: "Marketing Lead",
    role: "Outdoor apparel",
  },
];

export const FAQ = [
  {
    q: "How fast can I get my first campaign?",
    a: "Most teams train their Brand DNA and ship a first draft in under 20 minutes. The free trial is built to get you to a real, usable output on day one.",
  },
  {
    q: "Will it actually sound like my brand?",
    a: "That's the core idea. Studio learns your voice, visual style, and offers from your site and assets, then everything it produces flows from that Brand DNA.",
  },
  {
    q: "Which channels does it publish to?",
    a: "One-click publishing to Facebook and Instagram today, with channel-ready exports for Google, Meta, email, and the web — and more on the way.",
  },
  {
    q: "Do I need a credit card to try it?",
    a: "No. The 14-day trial requires no card, and you can cancel anytime.",
  },
];
