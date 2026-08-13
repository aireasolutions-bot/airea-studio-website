import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Home } from "@/pages/Home";
import { Pricing } from "@/pages/Pricing";
import { SmallBusiness } from "@/pages/SmallBusiness";
import { Ecommerce } from "@/pages/Ecommerce";
import { HowItWorksPage } from "@/pages/HowItWorksPage";
import { FaqPage } from "@/pages/FaqPage";
import { Blog } from "@/pages/Blog";
import { BlogPost } from "@/pages/BlogPost";
import { PrivacyPolicy } from "@/pages/PrivacyPolicy";
import { TermsOfService } from "@/pages/TermsOfService";
import { Test } from "@/pages/Test";
import { Test1 } from "@/pages/Test1";
import { Test2 } from "@/pages/Test2";
import { ContentProvider, useC, isPreview } from "@/content/ContentProvider";
import { SITE_PAGES, HIDEABLE_PAGES, pageVisibleKey } from "@/lib/pages";

// Page-level show/hide (admin: Global → Pages). A switched-off page redirects
// customers home; the admin's preview/edit canvas can still open it.
function PageGate({ slug, children }: { slug: string; children: ReactNode }) {
  const c = useC();
  const hideable = HIDEABLE_PAGES.some((p) => p.slug === slug);
  if (hideable && c(pageVisibleKey(slug)) === "false" && !isPreview()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

// Map each page slug (from the SITE_PAGES manifest) to its component. Add a page
// to SITE_PAGES + here and it's live on the site AND in the admin automatically.
const PAGE_COMPONENTS: Record<string, ComponentType> = {
  home: Home,
  pricing: Pricing,
  "small-business": SmallBusiness,
  ecommerce: Ecommerce,
  "how-it-works": HowItWorksPage,
  faq: FaqPage,
  "privacy-policy": PrivacyPolicy,
  "terms-of-service": TermsOfService,
};

// Admin portal is a separate, lazy-loaded bundle — never weighs down the public site.
const AdminApp = lazy(() =>
  import("@/admin/AdminApp").then((m) => ({ default: m.AdminApp }))
);

function PublicApp() {
  return (
    <ContentProvider>
      <Layout>
        <Routes>
          {SITE_PAGES.map((p) => {
            const C = PAGE_COMPONENTS[p.slug];
            return C ? (
              <Route key={p.slug} path={p.path} element={<PageGate slug={p.slug}><C /></PageGate>} />
            ) : null;
          })}
          <Route path="/blog" element={<PageGate slug="blog"><Blog /></PageGate>} />
          <Route path="/blog/:slug" element={<PageGate slug="blog"><BlogPost /></PageGate>} />
          <Route path="/test" element={<Test />} />
          <Route path="/test-1" element={<Test1 />} />
          <Route path="/test-2" element={<Test2 />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Layout>
    </ContentProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<div className="grid min-h-screen place-items-center bg-canvas" />}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="/*" element={<PublicApp />} />
      </Routes>
    </BrowserRouter>
  );
}
