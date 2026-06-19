/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Partners from "./components/Partners";
import Specs from "./components/Specs";
import Heritage from "./components/Heritage";
import Team from "./components/Team";
import Contact from "./components/Contact";
import Loader from "./components/Loader";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      document.documentElement.classList.add('is-scrolling');
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        document.documentElement.classList.remove('is-scrolling');
      }, 1000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // -------- Loader conditional dismissal ----------
    // Show loader for at least 800ms (brand visibility).
    // Dismiss as soon as the hero image finishes loading,
    // with a hard cap of 2000ms to avoid blocking FCP/LCP.
    const MIN_SHOW = 800;
    const MAX_WAIT = 2000;
    const start = Date.now();

    // Preload the correct hero image for the current viewport
    const heroImg = new Image();
    heroImg.src =
      window.innerWidth < 768
        ? '/images/hero/hero-mobile.webp'
        : '/images/hero/hero-desktop.webp';

    let heroEarlyTimer: ReturnType<typeof setTimeout>;

    heroImg.onload = () => {
      const elapsed = Date.now() - start;
      const remaining = MIN_SHOW - elapsed;
      // If hero loaded before min show time, wait until MIN_SHOW to dismiss
      // If hero loaded after min show time, dismiss immediately
      heroEarlyTimer = setTimeout(() => setIsLoading(false), Math.max(0, remaining));
    };
    heroImg.onerror = () => {
      // On error, fall through to maxTimer
    };

    const maxTimer = setTimeout(() => setIsLoading(false), MAX_WAIT);
    // ------------------------------------------------

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
      clearTimeout(maxTimer);
      clearTimeout(heroEarlyTimer);
      heroImg.onload = null;
      heroImg.onerror = null;
    };
  }, []);

  return (
    <div className="min-h-screen bg-aurora-black text-aurora-white font-sans selection:bg-aurora-purple selection:text-aurora-white">
      <AnimatePresence>
        {isLoading && <Loader />}
      </AnimatePresence>
      
      <Navbar />
      <main>
        <Home />
        <Partners />
        <Specs />
        <Heritage />
        <Team />
      </main>
      <Contact />
      <SpeedInsights />
      <Analytics />
    </div>
  );
}
