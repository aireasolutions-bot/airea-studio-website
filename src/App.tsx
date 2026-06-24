import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Home } from "@/pages/Home";
import { Pricing } from "@/pages/Pricing";
import { SmallBusiness } from "@/pages/SmallBusiness";
import { Ecommerce } from "@/pages/Ecommerce";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/small-business" element={<SmallBusiness />} />
          <Route path="/ecommerce" element={<Ecommerce />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
