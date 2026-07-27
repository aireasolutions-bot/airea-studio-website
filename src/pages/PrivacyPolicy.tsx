import { PageSections } from "@/components/PageSections";
import { Seo } from "@/components/Seo";
import { EditableEyebrow } from "@/components/ui";
import { useC, editable } from "@/content/ContentProvider";
import { breadcrumbSchema } from "@/lib/seo";

const POLICY_SECTIONS = [
  {
    title: "Information we collect",
    body:
      "We collect information you provide directly, such as your name, email address, company details, billing information, campaign inputs, uploaded assets, and messages you send to us. We may also collect technical information about how you use AIREA Studio, including device, browser, log, usage, and analytics data.",
  },
  {
    title: "How we use information",
    body:
      "We use information to provide, secure, and improve AIREA Studio; create and manage accounts; process payments; generate and manage marketing campaigns; respond to support requests; personalize your experience; send service updates; and understand how our website and product are performing.",
  },
  {
    title: "AI inputs and generated content",
    body:
      "AIREA Studio may process the prompts, brand materials, images, campaign details, and other content you provide so the platform can generate outputs for you. You are responsible for ensuring you have the rights to the materials you upload and the permissions needed to use generated content in your campaigns.",
  },
  {
    title: "Sharing information",
    body:
      "We do not sell your personal information. We may share information with trusted service providers who help us operate the website, application, hosting, analytics, customer support, payment processing, communications, and security. We may also disclose information if required by law or to protect AIREA Studio, our users, or the public.",
  },
  {
    title: "Cookies and tracking",
    body:
      "We may use cookies and similar technologies to keep the site working, remember preferences, measure performance, improve marketing, and understand visitor behavior. You can control cookies through your browser settings, though some features may not work correctly without them.",
  },
  {
    title: "Data retention",
    body:
      "We keep information for as long as needed to provide the service, comply with legal obligations, resolve disputes, enforce agreements, and maintain business records. When information is no longer needed, we take reasonable steps to delete or de-identify it.",
  },
  {
    title: "Security",
    body:
      "We use reasonable administrative, technical, and organizational safeguards designed to protect information. No online service can be guaranteed to be completely secure, so we encourage you to use strong passwords and keep your account credentials confidential.",
  },
  {
    title: "Your choices",
    body:
      "Depending on your location, you may have rights to access, correct, delete, or restrict certain personal information. You can also opt out of non-essential marketing emails by using the unsubscribe link in those messages or by contacting us.",
  },
  {
    title: "Changes to this policy",
    body:
      "We may update this Privacy Policy from time to time. If we make material changes, we will update the effective date and, where appropriate, provide additional notice.",
  },
  {
    title: "Contact us",
    body:
      "If you have questions about this Privacy Policy or how AIREA Studio handles information, contact us at info@aireastudio.ai.",
  },
];

export function PrivacyPolicy() {
  const c = useC();

  const policy = (
    <section className="relative overflow-hidden pb-24 pt-32 md:pt-40">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-blue-radial" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.32] [mask-image:radial-gradient(ellipse_at_top,black,transparent_62%)]" />

      <div className="wrap">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <EditableEyebrow k="privacy.eyebrow" defaultLabel="Legal" />
          </div>
          <h1
            className="mt-6 font-display text-[clamp(40px,6vw,72px)] leading-[1.02] tracking-[-0.02em] text-ink"
            {...editable("privacy.title")}
          >
            {c("privacy.title", "Privacy Policy")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[clamp(15px,1.5vw,18px)] text-ink-2" {...editable("privacy.intro", "richtext")}>
            {c(
              "privacy.intro",
              "This Privacy Policy explains how AIREA Studio collects, uses, shares, and protects information when you use our website, product, and related services."
            )}
          </p>
          <p className="mt-5 font-mono text-[12px] uppercase tracking-wider text-ink-3" {...editable("privacy.updated")}>
            {c("privacy.updated", "Last updated: July 2026")}
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
          <div className="border-b border-line bg-paper px-6 py-5 md:px-8">
            <p className="text-[14.5px] leading-relaxed text-ink-2" {...editable("privacy.notice", "richtext")}>
              {c(
                "privacy.notice",
                "We keep this policy straightforward so you can understand what information we collect, why we collect it, and the choices available to you."
              )}
            </p>
          </div>

          <div className="divide-y divide-line">
            {POLICY_SECTIONS.map((section, i) => (
              <article key={section.title} className="px-6 py-7 md:px-8 md:py-8">
                <h2 className="font-display text-[clamp(24px,3vw,34px)] leading-tight tracking-[-0.01em] text-ink" {...editable(`privacy.section${i}.title`)}>
                  {c(`privacy.section${i}.title`, section.title)}
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2" {...editable(`privacy.section${i}.body`, "richtext")}>
                  {c(`privacy.section${i}.body`, section.body)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <>
      <Seo
        path="/privacy-policy"
        jsonLd={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Privacy Policy", path: "/privacy-policy" },
          ]),
        ]}
      />
      <PageSections page="privacy-policy" sections={{ policy }} />
    </>
  );
}
