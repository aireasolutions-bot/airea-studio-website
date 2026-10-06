import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

/** Initialise Lenis smooth scrolling and bind it to GSAP ScrollTrigger. */
export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    // Lenis takes over the mouse wheel for the whole page. Without these two
    // options it also swallows wheel events over panels it doesn't own, so a
    // third-party overlay (Meta's Event Setup Tool dropdown, chat widgets,
    // cookie banners) can't be scrolled at all.
    const root = document.getElementById("root");
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
      // Any scrollable container that can still scroll scrolls natively.
      allowNestedScroll: true,
      // Anything injected outside our app is left entirely to the browser.
      prevent: (node) => node !== document.body && !!root && !root.contains(node),
    });

    (window as unknown as { lenis?: Lenis }).lenis = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      (window as unknown as { lenis?: Lenis }).lenis = undefined;
    };
  }, []);
}

/** Smoothly scroll to a target selector or element. */
export function scrollToTarget(target: string | HTMLElement, offset = -72) {
  const lenis = (window as unknown as { lenis?: Lenis }).lenis;
  if (lenis) {
    lenis.scrollTo(target, { offset });
  } else if (typeof target === "string") {
    document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
  } else {
    target.scrollIntoView({ behavior: "smooth" });
  }
}
