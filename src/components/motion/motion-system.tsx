"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const revealSelector = [
  ".page-header",
  ".card",
  ".crew-command-card",
  ".crew-metric-strip",
  ".crew-panel",
  ".landing-section-heading",
  ".landing-feature-main",
  ".landing-feature-stack > article",
  ".landing-employee-grid > article",
  ".landing-steps > article",
  ".landing-final-cta > *:not(.landing-cta-grid)",
].join(",");

export function MotionSystem() {
  const pathname = usePathname();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = Array.from(document.querySelectorAll<HTMLElement>(revealSelector));

    elements.forEach((element, index) => {
      element.dataset.motion = "reveal";
      element.style.setProperty("--motion-order", String(index % 8));
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
        document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("pointermove", move); };
  }, []);

  return <div className="motion-cursor-glow" aria-hidden="true" />;
}
