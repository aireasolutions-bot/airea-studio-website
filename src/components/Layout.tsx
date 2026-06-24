import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";

export function Layout({ children }: { children: ReactNode }) {
  useSmoothScroll();
  const { pathname } = useLocation();

  useEffect(() => {
    const lenis = (window as unknown as { lenis?: { scrollTo: (t: number, o?: object) => void } })
      .lenis;
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  );
}
