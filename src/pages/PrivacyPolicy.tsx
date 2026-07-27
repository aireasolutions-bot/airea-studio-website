import { PageSections } from "@/components/PageSections";
import { Seo } from "@/components/Seo";
import { EditableEyebrow } from "@/components/ui";
import { useC, editable } from "@/content/ContentProvider";
import { breadcrumbSchema } from "@/lib/seo";

const POLICY_INTRO = `AIREA Solutions, Inc., d/b/a AIREA Studio ("AIREA Studio," "we," "us," or "our") provides an AI-powered platform for generating marketing images and copy (the "Services"). This Privacy Policy explains what personal information we collect, how we use and share it, and the choices and rights available to you. This Policy is incorporated into our Terms of Service by reference.`;

const POLICY_SECTIONS = [
  {
    title: "1. Scope",
    body: `This Policy applies to personal information we collect through the Services, our website, and related communications. It applies to our business customers ("Customer," "you") and their Authorized Users. It does not apply to Third-Party AI Providers' or other third-party platforms' own handling of data, which is governed by their respective privacy policies.`,
  },
  {
    title: "2. Information We Collect",
    body: `2.1 Account and Contact Information. Name, business name, email address, phone number, and password when you create an account.
2.2 Customer Property. Input you submit to the Services (text prompts, uploaded Brand Assets such as logos, fonts, and product images) and the Output generated from it.
2.3 Payment Information. Billing details are collected and processed by our payment processor, Stripe; AIREA Studio does not store full payment card numbers.
2.4 Usage Data. Log data, device and browser information, IP address, feature usage, Token consumption, and similar diagnostic and analytics information collected automatically when you use the Services.
2.5 Integration Data. If you connect third-party platforms (e.g., Meta, Google, Shopify), we may receive account identifiers and limited data needed to provide the integration, as authorized by you and permitted by that platform's terms.
2.6 Communications. Information you provide when you contact support or otherwise communicate with us.`,
  },
  {
    title: "3. How We Use Information",
    body: `We use personal information to:
Provide, operate, and maintain the Services, including generating Output from your Input;
Process payments and manage billing and Token balances;
Provide customer support and respond to inquiries;
Monitor, secure, and troubleshoot the Services, and prevent fraud or abuse;
Communicate with you about updates, security notices, and administrative matters;
Comply with legal obligations.

We do not use your Input or Output to train or improve our underlying AI models, consistent with Section 4.6 of our Terms of Service. We may use de-identified, aggregated usage data (Aggregated Statistics) to analyze and improve the Services generally.`,
  },
  {
    title: "4. How We Share Information",
    body: `We do not sell your personal information. We share information only as follows:
4.1 Third-Party AI Providers. To generate Output, your Input is transmitted to the AI providers that power the Services (currently OpenAI and Google Gemini) via their respective business/API terms. These providers process the data to return Output to us and, per their standard API terms, generally do not use API-submitted data to train their own models — but their handling of data is governed by their own policies, which we encourage you to review.
4.2 Service Providers. Hosting and infrastructure providers, our payment processor (Stripe), analytics providers, and other vendors who process data on our behalf under confidentiality and data-protection obligations.
4.3 Third-Party Platform Integrations. If you connect Meta, Google, Shopify, or similar platforms, limited data is shared with those platforms as necessary to provide the integration, subject to their own terms.
4.4 Legal and Safety. When required by law, legal process, or to protect the rights, property, or safety of AIREA Studio, our customers, or others.
4.5 Business Transfers. In connection with a merger, acquisition, financing, or sale of assets, subject to standard confidentiality protections.`,
  },
  {
    title: "5. Cookies and Tracking Technologies",
    body: `We use cookies and similar technologies to operate the Services, remember preferences, and understand usage patterns through analytics. You can control cookies through your browser settings; disabling some cookies may affect functionality.`,
  },
  {
    title: "6. Data Retention",
    body: `We retain personal information and Customer Property for as long as your account is active and as needed to provide the Services. Following termination of your account, we retain Customer Property for a limited period (see Section 17.4 of our Terms of Service) to allow export, after which it is deleted or de-identified, except where longer retention is required for legal, tax, or dispute-resolution purposes.`,
  },
  {
    title: "7. Data Security",
    body: `We maintain reasonable administrative, technical, and physical safeguards designed to protect personal information, consistent with Section 10 of our Terms of Service. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.`,
  },
  {
    title: "8. Your Privacy Rights",
    body: `8.1 California Residents. If you are a California resident, you may have rights under the California Consumer Privacy Act (CCPA), as amended, including the right to know what personal information we collect, request deletion or correction of your personal information, and opt out of the "sale" or "sharing" of personal information (we do not sell personal information). You will not be discriminated against for exercising these rights. To exercise these rights, contact us at info@aireastudio.ai.
8.2 EEA/UK Residents. If you are located in the EEA or UK, you may have rights under the GDPR or UK GDPR, including the right to access, correct, delete, or port your personal information, restrict or object to certain processing, and lodge a complaint with your local data protection authority. To exercise these rights, contact us at [privacy@aireastudio.ai].
8.3 Verification. We may need to verify your identity before fulfilling a rights request.`,
  },
  {
    title: "9. International Data Transfers",
    body: `We are based in the United States, and personal information is processed and stored in the U.S. and other locations where our service providers operate. Where required, we implement appropriate safeguards for cross-border transfers, such as standard contractual clauses, consistent with Section 20.1 of our Terms of Service.`,
  },
  {
    title: "10. Children's Privacy",
    body: `The Services are intended for business use and are not directed to individuals under 13 (or under 16 in the EU/UK). We do not knowingly collect personal information from children. If you believe a child has provided us personal information, contact us at info@aireastudio.ai and we will delete it.`,
  },
  {
    title: "11. Third-Party Links and Integrations",
    body: `The Services may contain links to, or integrations with, third-party websites and platforms (e.g., Meta, Google, Shopify, Stripe, and our Third-Party AI Providers). This Policy does not apply to those third parties' own privacy practices, which are governed by their respective policies.`,
  },
  {
    title: "12. Changes to This Policy",
    body: `We may update this Policy from time to time. We will post the updated Policy with a new "Last Updated" date and, for material changes, provide notice via email or in-app notification consistent with Section 21.2 of our Terms of Service.`,
  },
  {
    title: "13. Contact Us",
    body: `Questions about this Policy or your personal information can be sent to:
AIREA Solutions, Inc., d/b/a AIREA Studio info@aireastudio.ai`,
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
          <p className="mt-5 font-mono text-[12px] uppercase tracking-wider text-ink-3" {...editable("privacy.updated")}>
            {c("privacy.updated", "Last Updated: Jul 1, 2026")}
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
          <div className="border-b border-line bg-paper px-6 py-6 md:px-8">
            <p className="text-[15px] leading-relaxed text-ink-2" {...editable("privacy.intro", "richtext")}>
              {c("privacy.intro", POLICY_INTRO)}
            </p>
          </div>

          <div className="divide-y divide-line">
            {POLICY_SECTIONS.map((section, i) => (
              <article key={section.title} className="px-6 py-7 md:px-8 md:py-8">
                <h2 className="font-display text-[clamp(24px,3vw,34px)] leading-tight tracking-[-0.01em] text-ink" {...editable(`privacy.section${i}.title`)}>
                  {c(`privacy.section${i}.title`, section.title)}
                </h2>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-2" {...editable(`privacy.section${i}.body`, "richtext")}>
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
