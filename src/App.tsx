/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
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
    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
      clearTimeout(timer);
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
    </div>
  );
}
