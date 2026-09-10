/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Partners from "./components/Partners";
import Specs from "./components/Specs";
import Heritage from "./components/Heritage";
import Team from "./components/Team";
import Footer from "./components/Footer";
import { useHashRoute } from "./hooks/useHashRoute";
import { useIsMobile } from "./hooks/useIsMobile";

export default function App() {
  const route = useHashRoute();
  const isMobile = useIsMobile();

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

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // 桌面端：切换页面时滚回顶部；移动端保持单页滚动，不重置
  useEffect(() => {
    if (!isMobile) window.scrollTo(0, 0);
  }, [route, isMobile]);

  return (
    <div className="min-h-screen bg-aurora-black text-aurora-white font-sans selection:bg-aurora-purple selection:text-aurora-white">
      <Navbar />
      <main>
        {isMobile ? (
          <>
            <Home />
            <Partners />
            <Specs />
            <Heritage />
            <Team />
          </>
        ) : (
          <>
            {route === "home" && (
              <>
                <Home />
                <Partners />
              </>
            )}
            {route === "specs" && <Specs />}
            {route === "story" && <Heritage />}
            {route === "team" && <Team />}
          </>
        )}
      </main>
      <Footer />
      <SpeedInsights />
      <Analytics />
    </div>
  );
}
