import { lazy, Suspense, type ComponentType } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Home } from "@/pages/Home";
import { Pricing } from "@/pages/Pricing";
import { SmallBusiness } from "@/pages/SmallBusiness";
import { Ecommerce } from "@/pages/Ecommerce";
import { HowItWorksPage } from "@/pages/HowItWorksPage";
import { FaqPage } from "@/pages/FaqPage";
import { ContentProvider } from "@/content/ContentProvider";
import { SITE_PAGES } from "@/lib/pages";

// Map each page slug (from the SITE_PAGES manifest) to its component. Add a page
// to SITE_PAGES + here and it's live on the site AND in the admin automatically.
const PAGE_COMPONENTS: Record<string, ComponentType> = {
  home: Home,
  pricing: Pricing,
  "small-business": SmallBusiness,
  ecommerce: Ecommerce,
  "how-it-works": HowItWorksPage,
  faq: FaqPage,
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
            return C ? <Route key={p.slug} path={p.path} element={<C />} /> : null;
          })}
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
