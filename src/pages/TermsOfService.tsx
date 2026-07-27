import { PageSections } from "@/components/PageSections";
import { Seo } from "@/components/Seo";
import { EditableEyebrow } from "@/components/ui";
import { useC, editable } from "@/content/ContentProvider";
import { breadcrumbSchema } from "@/lib/seo";

const TERMS_NOTICE = `These Terms of Service contain important legal information, including a mandatory arbitration provision and class action waiver. Please read carefully before using our services.`;

const TERMS_SECTIONS = [
  {
    title: "1. Agreement Overview",
    body: `These Terms of Service ("Agreement") form a binding contract between you ("Customer," "you," or "your") and AIREA Solutions, Inc., d/b/a AIREA Studio ("AIREA Studio," "we," "us," or "our"). This Agreement governs your access to and use of the AIREA platform, including all AI-generated image and copy tools and related services (collectively, the "Services").
By creating an account or using the Services, you agree to this Agreement. If you do not agree, do not use the Services.`,
  },
  {
    title: "2. Definitions",
    body: `"Aggregated Statistics" — data related to Customer's use of the Services that AIREA Studio compiles in anonymized, aggregated form to analyze and improve the Services.
"Authorized User" — Customer's employees, consultants, contractors, or agents authorized to access the Services on Customer's behalf.
"Customer Property" — content, data, or materials Customer provides to AIREA Studio, including Input, Output, and Brand Assets.
"Brand Assets" — logos, fonts, product photography, trademarks, and other brand materials Customer uploads to the Services.
"Input" — text, images, prompts, Brand Assets, or other information Customer submits to the Services, which Customer represents it owns or has the right to use.
"Output" — the AI-generated images, copy, or other content produced by the Services based on Input.
"AIREA Studio Property" — the Services, documentation, underlying models, software, and all related materials, excluding Customer Property.
"Third-Party AI Providers" — the underlying generative AI model providers used to power parts of the Services (currently including OpenAI and Google Gemini, which may change from time to time).
"Tokens" — the credit-based unit AIREA Studio uses to meter usage of certain features, as described in Section 6.`,
  },
  {
    title: "3. Access and Use",
    body: `3.1 Eligibility. You must be able to form a legally binding contract to use the Services. Use of the Services by anyone under 13 (or under 16 in the EU/UK) is prohibited. The Services are intended for business use, not personal/consumer use.
3.2 License Grant. Subject to your compliance with this Agreement and payment of applicable fees, AIREA Studio grants you a non-exclusive, non-transferable, revocable right to access and use the Services during the Term, solely for your internal business operations, through Authorized Users.
3.3 Accounts. You must provide accurate, complete account information and keep your login credentials confidential. You are responsible for all activity occurring under your account.
3.4 Use Restrictions. You may not:
Copy, resell, sublicense, or redistribute the Services;
Use bots, scrapers, or other automated means to access the Services beyond normal human usage patterns;
Reverse-engineer, decompile, or attempt to extract the underlying models or source code;
Interfere with the security, integrity, or performance of the Services;
Use the Services to build a competing product.`,
  },
  {
    title: "4. AI-Specific Terms",
    body: `4.1 Nature of AI-Generated Output. The Services use generative artificial intelligence, including Third-Party AI Providers, to produce Output based on your Input. AI-generated content is probabilistic: it may be inaccurate, unexpected, repetitive, or — on rare occasions — resemble existing third-party content, trademarks, or the likeness of real individuals, without AIREA Studio's or your knowledge or intent.
4.2 No Guarantee of Uniqueness or Non-Infringement. AIREA Studio does not guarantee that Output is unique to you or free of third-party intellectual property claims. Similar or substantially similar Output may be generated for other customers from similar Input.
4.3 Ownership and License to Output. As between you and AIREA Studio, and subject to your compliance with this Agreement and payment of applicable fees, AIREA Studio assigns to you all of its right, title, and interest in the Output generated from your Input, for your use in your business's marketing and related purposes. This is contingent on your representation in Section 4.4 below.
4.4 Your Representations. You represent and warrant that: (a) you own or have all necessary rights to any Input you submit (including any uploaded images, logos, likenesses, or Brand Assets); and (b) your use of the Services and any resulting Output will not violate any law or infringe any third party's rights.
4.5 Acceptable Use / Prohibited Content. You may not use the Services to generate, upload, or distribute content that:
Depicts, sexualizes, or endangers minors;
Is intended to deceive consumers about a real product, service, price, or endorsement, or otherwise constitutes false or misleading advertising;
Impersonates a real person without consent, including deceptive "deepfake" imagery or fabricated quotes or endorsements;
Infringes a third party's trademark, copyright, publicity, or other intellectual property rights;
Promotes hate, discrimination, violence, or illegal activity;
Contains malware or is intended to disrupt, damage, or gain unauthorized access to any system;
Violates any applicable law or regulation.
AIREA Studio may remove or block content, and suspend or terminate accounts, that violate this Section 4.5, in accordance with Section 17 (Term, Suspension, and Termination).
4.6 Use of Data for Model Training. AIREA Studio does not use your Input or Output to train or improve its underlying AI models. Your data may still be processed by AIREA Studio and by Third-Party AI Providers as needed to operate and support the Services (e.g., for troubleshooting, abuse prevention, and service improvement not involving model training), as described in our Privacy Policy.
4.7 Third-Party AI Providers. Parts of the Services rely on Third-Party AI Providers (currently OpenAI and Google Gemini). Your Input may be transmitted to these providers to generate Output, subject to their own terms and data-handling practices. AIREA Studio is not responsible for the acts or omissions of Third-Party AI Providers, and may change providers at its discretion without notice.
4.8 AI Safety and Human Review. Output is generated by AI and is intended as a drafting aid, not a finished, verified deliverable. You must have a qualified human review, fact-check, and approve all Output before publishing, distributing, or relying on it — this is especially important for marketing claims, pricing, promotional offers, health/medical or financial statements, legal disclosures, and anything else that could mislead a consumer or trigger a regulatory obligation (e.g., FTC advertising and AI-disclosure guidance). AIREA Studio is not a substitute for legal, medical, financial, or compliance review, and you remain solely responsible for how you use Output.`,
  },
  {
    title: "5. Brand Assets and Customer Uploads",
    body: `5.1 Ownership. You retain all ownership of any logos, fonts, product images, trademarks, and other Brand Assets you upload to the Services. AIREA Studio does not acquire any ownership interest in your Brand Assets.
5.2 License to Process. You grant AIREA Studio a limited, non-exclusive license to store, reproduce, and process your Brand Assets solely to generate Output and otherwise provide the Services to you.
5.3 Your Warranty. You represent that you own or are authorized to use each Brand Asset you upload, and that uploading and processing it through the Services will not infringe any third party's trademark, copyright, or other rights. AIREA Studio does not verify trademark ownership or clearance and is not responsible for confirming your rights to any Brand Asset.
5.4 Removal. You may delete Brand Assets from your account at any time. Upon termination of your account, Brand Assets will be handled per Section 13.4 (Effect of Termination).`,
  },
  {
    title: "6. Fees, Payment, and Tokens",
    body: `6.1 Billing. Use of the Services may be subject to fees as described on our Pricing page. AIREA Studio may change fees prospectively with at least 30 days' notice for existing subscriptions.
6.2 No Refunds. All fees are non-refundable, including upon termination, except where required by law.
6.3 Free Trials. Free trials do not automatically convert to a paid subscription. At the end of the trial period, your access to the Services will end unless you affirmatively choose to subscribe.
6.4 Automatic Renewal. Subscriptions renew automatically at the end of each billing period unless canceled prior to renewal. By subscribing, you authorize AIREA Studio to charge your payment method for renewal fees.
6.5 AIREA Tokens. Certain features are metered using Tokens, which are consumed based on usage (e.g., per image or copy generation) as described on our Pricing page. Tokens: (a) have no cash value and are not redeemable for cash; (b) are non-transferable between accounts; (c) expire at the end of your then-current billing cycle or subscription term, as described on our Pricing page, unless otherwise stated; and (d) may have their pricing, allotment, or consumption rates changed prospectively, with notice, as described in Section 6.1.`,
  },
  {
    title: "7. Intellectual Property",
    body: `7.1 Customer Property. AIREA Studio does not claim ownership of Customer Property. You grant AIREA Studio a limited license to host, process, and use Customer Property solely to provide and improve the Services (including as described in Section 4.6).
7.2 AIREA Studio Property. AIREA Studio retains all right, title, and interest in AIREA Studio Property, including the underlying models, software, and documentation. No rights are granted except as expressly stated in this Agreement.
7.3 Feedback. If you provide suggestions or feedback about the Services, you grant AIREA Studio a perpetual, royalty-free license to use it without restriction or obligation to you.
7.4 Copyright / DMCA Policy. AIREA Studio respects intellectual property rights and responds to notices of alleged copyright infringement under the Digital Millennium Copyright Act (DMCA).
(a) Filing a Notice. If you believe content accessible through the Services infringes your copyright, send a written notice to our designated DMCA agent, below, including: (i) a physical or electronic signature of the copyright owner or authorized representative; (ii) identification of the copyrighted work claimed to be infringed; (iii) identification of the material claimed to be infringing and information reasonably sufficient to locate it; (iv) your contact information (address, phone number, email); (v) a statement that you have a good-faith belief the use is not authorized by the copyright owner, its agent, or the law; and (vi) a statement, made under penalty of perjury, that the information in the notice is accurate and that you are authorized to act on behalf of the copyright owner.
(b) Designated Agent. DMCA notices should be sent to: AIREA Solutions, Inc., d/b/a AIREA Studio info@aireastudio.ai.
(c) Counter-Notice. If you believe content was removed or disabled by mistake or misidentification, you may submit a counter-notice to the same address containing: (i) your physical or electronic signature; (ii) identification of the material removed and its location before removal; (iii) a statement, under penalty of perjury, that you have a good-faith belief the material was removed as a result of mistake or misidentification; (iv) your name, address, and phone number; and (v) a statement consenting to the jurisdiction of the federal court in your district (or, if outside the U.S., an appropriate judicial district) and that you will accept service of process from the person who filed the original notice.
(d) Repeat Infringers. AIREA Studio may, in appropriate circumstances, suspend or terminate the accounts of users who are repeat infringers.`,
  },
  {
    title: "8. Privacy and Data Processing",
    body: `8.1 Privacy Policy. Our collection, use, and processing of personal data through the Services is described in our Privacy Policy at https://www.aireastudio.ai/privacy, which is incorporated into this Agreement by reference.
8.2 Subprocessors. To provide the Services, AIREA Studio may share data with service providers acting on our behalf, including Third-Party AI Providers, hosting providers, payment processors, and analytics providers, each bound by confidentiality and data-protection obligations consistent with our Privacy Policy.
8.3 Data Retention. We retain Customer Property consistent with Section 13.4 (Effect of Termination) and our Privacy Policy's data retention practices.`,
  },
  {
    title: "9. Confidentiality",
    body: `Each party will protect the other's Confidential Information using reasonable care and use it only for purposes related to this Agreement. These obligations survive for five years after disclosure, except trade secrets, which remain protected as long as they qualify as trade secrets under applicable law.`,
  },
  {
    title: "10. Security",
    body: `10.1 Our Commitment. AIREA Studio maintains reasonable administrative, technical, and physical safeguards designed to protect Customer Property against unauthorized access, use, or disclosure. No system is completely secure, and AIREA Studio cannot guarantee absolute security.
10.2 Your Responsibilities. You are responsible for maintaining the confidentiality of your account credentials, using strong passwords and, where available, multi-factor authentication, and promptly notifying AIREA Studio at info@aireastudio.ai of any suspected unauthorized access to your account.`,
  },
  {
    title: "11. Service Levels and Availability",
    body: `The Services are provided on an "as available" basis. AIREA Studio does not guarantee any specific level of uptime or availability unless expressly agreed in a separate service level agreement. AIREA Studio may perform scheduled maintenance and will use reasonable efforts to provide advance notice of maintenance expected to cause a material service interruption, but is not liable for downtime, delays, or interruptions, subject to Section 15 (Limitation of Liability).`,
  },
  {
    title: "12. API and Third-Party Integrations",
    body: `12.1 API Access. If AIREA Studio provides API access, you may use it only in accordance with our API documentation and any applicable rate limits, and only through API keys issued to you, which you must keep confidential.
12.2 Third-Party Platform Integrations. The Services may integrate with third-party platforms (currently including Meta, Google, Shopify, and Stripe). Use of these integrations is also subject to each platform's own terms of service and policies (e.g., Meta's Platform Terms, Google's API Services User Data Policy, Shopify's Partner Program Agreement, and Stripe's Services Agreement). You are responsible for maintaining your own accounts with these platforms and complying with their terms; AIREA Studio is not responsible for their acts, omissions, or policy changes.
12.3 Revocation. AIREA Studio may suspend or revoke API access or integrations at any time for security, legal, or platform-compliance reasons.`,
  },
  {
    title: "13. Beta and Experimental Features",
    body: `From time to time, AIREA Studio may make features available on a preview, "beta," or experimental basis. These features are provided "as is," may be changed or discontinued at any time without notice, may not perform as intended, and are not covered by any service level commitment. Feedback you provide about beta features is governed by Section 7.3 (Feedback).`,
  },
  {
    title: "14. Disclaimers",
    body: `THE SERVICES, INCLUDING ALL OUTPUT, ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY. AIREA STUDIO DOES NOT WARRANT THAT OUTPUT WILL BE ERROR-FREE, SUITABLE FOR ANY PARTICULAR PURPOSE, OR FREE OF THIRD-PARTY CLAIMS.`,
  },
  {
    title: "15. Limitation of Liability",
    body: `TO THE MAXIMUM EXTENT PERMITTED BY LAW: (A) AIREA STUDIO WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES; AND (B) AIREA STUDIO'S TOTAL LIABILITY ARISING OUT OF THIS AGREEMENT WILL NOT EXCEED THE FEES YOU PAID TO AIREA STUDIO IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM. Some jurisdictions do not allow certain liability limitations, so some of the above may not apply to you.`,
  },
  {
    title: "16. Indemnification",
    body: `16.1 By You. You will indemnify and hold harmless AIREA Studio from third-party claims arising from: (a) your Input, Brand Assets, or use of Output in violation of Section 4.4, 4.5, or 5.3; (b) your breach of this Agreement; or (c) your violation of applicable law.
16.2 By AIREA Studio. AIREA Studio will indemnify and hold harmless Customer from third-party claims that the Services (excluding Output, Input, Brand Assets, and Third-Party AI Providers' components) infringe a valid U.S. patent, copyright, or trademark, subject to AIREA Studio's right to modify the Services or terminate access as an alternative remedy.`,
  },
  {
    title: "17. Term, Suspension, and Termination",
    body: `17.1 Term. This Agreement remains in effect while you maintain an account or subscription.
17.2 Termination by You. You may cancel your subscription at any time through account settings; cancellation takes effect at the end of the current billing period.
17.3 Suspension/Termination by AIREA Studio. We may suspend or terminate your access immediately for breach of this Agreement, suspected fraud, security risk, or legal requirement.
17.4 Effect of Termination. Upon termination, your right to use the Services ends immediately. AIREA Studio will make reasonable efforts to allow export of your Customer Property for 30 days post-termination, after which it may be deleted. Sections concerning IP, confidentiality, disclaimers, liability limits, indemnification, and dispute resolution survive termination.`,
  },
  {
    title: "18. Export Controls and Sanctions",
    body: `You may not use the Services if you are located in, or a national or resident of, any country subject to U.S. embargo, or if you are listed on any U.S. government denied- or restricted-party list (e.g., the U.S. Treasury's OFAC Specially Designated Nationals list). You agree to comply with all applicable U.S. and international export control and economic sanctions laws in your use of the Services.`,
  },
  {
    title: "19. Dispute Resolution",
    body: `19.1 Governing Law. This Agreement is governed by the laws of the State of California, without regard to conflict-of-laws principles.
19.2 Arbitration. Except for claims that qualify for small-claims court or injunctive relief to protect intellectual property, any dispute arising under this Agreement will be resolved by binding arbitration administered by the American Arbitration Association ("AAA") under its rules, conducted in San Francisco, California, unless you and AIREA Studio agree otherwise.
19.3 Class Action Waiver. Disputes must be brought individually, not as a class, collective, or representative action, and not before a jury.
19.4 Opt-Out. You may opt out of this arbitration agreement by sending written notice to info@aireastudio.ai within 30 days of first accepting this Agreement.`,
  },
  {
    title: "20. International Users and California Privacy Rights",
    body: `20.1 International Use. The Services are operated from the United States. If you access the Services from outside the U.S., including the EEA, UK, or elsewhere, you do so on the understanding that your data will be processed in the U.S. and other locations as described in our Privacy Policy, and you consent to such processing. Where required by applicable data protection law (e.g., GDPR/UK GDPR), AIREA Studio will implement appropriate safeguards, such as standard contractual clauses, for cross-border transfers.
20.2 California Residents. If you are a California resident, you may have rights under the California Consumer Privacy Act (CCPA), as amended, including the right to know, delete, and correct personal information, and the right to opt out of the sale or sharing of personal information and to be free from discrimination for exercising these rights. See our Privacy Policy at https://www.aireastudio.ai/privacy for details on how to exercise these rights.`,
  },
  {
    title: "21. General Provisions",
    body: `21.1 Third-Party Products. The Services may link to or integrate with third-party products, including Third-Party AI Providers and the platforms referenced in Section 12.2, which are governed by their own terms. AIREA Studio is not responsible for third-party products.
21.2 Modification. AIREA Studio may modify this Agreement at any time; material changes will be notified via email or in-app notice at least 14 days before taking effect. Continued use after changes take effect constitutes acceptance.
21.3 Assignment. You may not assign this Agreement without AIREA Studio's prior written consent. AIREA Studio may assign this Agreement in connection with a merger, acquisition, or sale of assets.
21.4 Severability. If any provision of this Agreement is found unenforceable, the remaining provisions remain in full effect.
21.5 Waiver. Failure to enforce any provision is not a waiver of the right to enforce it later.
21.6 Force Majeure. Neither party is liable for delays or failures caused by events beyond its reasonable control.
21.7 Notices. Legal notices to AIREA Studio must be sent to info@aireastudio.ai.  Notices to you will be sent to the email associated with your account.
21.8 Entire Agreement. This Agreement, together with our Privacy Policy, constitutes the entire agreement between you and AIREA Studio regarding the Services.

Questions about these Terms? Contact us at info@aireastudio.ai.`,
  },
];

export function TermsOfService() {
  const c = useC();

  const terms = (
    <section className="relative overflow-hidden pb-24 pt-32 md:pt-40">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-blue-radial" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.32] [mask-image:radial-gradient(ellipse_at_top,black,transparent_62%)]" />

      <div className="wrap">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <EditableEyebrow k="terms.eyebrow" defaultLabel="Legal" />
          </div>
          <h1
            className="mt-6 font-display text-[clamp(40px,6vw,72px)] leading-[1.02] tracking-[-0.02em] text-ink"
            {...editable("terms.title")}
          >
            {c("terms.title", "Terms of Service")}
          </h1>
          <p className="mt-5 font-mono text-[12px] uppercase tracking-wider text-ink-3" {...editable("terms.updated")}>
            {c("terms.updated", "Last Updated: Jul 13, 2026")}
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
          <div className="border-b border-line bg-paper px-6 py-6 md:px-8">
            <p className="text-[15px] leading-relaxed text-ink-2" {...editable("terms.notice", "richtext")}>
              {c("terms.notice", TERMS_NOTICE)}
            </p>
          </div>

          <div className="divide-y divide-line">
            {TERMS_SECTIONS.map((section, i) => (
              <article key={section.title} className="px-6 py-7 md:px-8 md:py-8">
                <h2 className="font-display text-[clamp(24px,3vw,34px)] leading-tight tracking-[-0.01em] text-ink" {...editable(`terms.section${i}.title`)}>
                  {c(`terms.section${i}.title`, section.title)}
                </h2>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-2" {...editable(`terms.section${i}.body`, "richtext")}>
                  {c(`terms.section${i}.body`, section.body)}
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
        path="/terms-of-service"
        jsonLd={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Terms of Service", path: "/terms-of-service" },
          ]),
        ]}
      />
      <PageSections page="terms-of-service" sections={{ terms }} />
    </>
  );
}
