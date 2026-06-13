import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Instagram, ShoppingCart } from "lucide-react";
import AuroraLogo from "./AuroraLogo";

export default function Contact() {
  const [showStoreQR, setShowStoreQR] = useState(false);
  const qrRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleDoc(e: MouseEvent) {
      if (!qrRef.current) return;
      if (showStoreQR && !qrRef.current.contains(e.target as Node)) {
        setShowStoreQR(false);
      }
    }
    document.addEventListener("click", handleDoc);
    return () => document.removeEventListener("click", handleDoc);
  }, [showStoreQR]);

  return (
    <footer
      id="contact"
      className="w-full bg-aurora-black pt-2 pb-4 md:py-8 border-t border-aurora-white/10"
    >
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4 md:gap-4">
          {/* Brand Info (Left) */}
          <div className="flex flex-col items-center md:items-start gap-1 md:gap-2">
            <div className="flex items-center">
              <AuroraLogo className="hidden md:block w-32 h-auto" />
              <img 
                src="/images/logos/logo-mobile.webp" 
                alt="Aurora Logo" 
                className="md:hidden w-20 h-auto"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col items-center md:items-start gap-0.5 md:gap-1 mt-0.5 md:mt-2 text-center md:text-left">
              <p className="text-aurora-white/40 text-[10px] md:text-xs text-center md:text-left">
                广东省深圳市坪山区<br className="md:hidden" />
                兰田路3002号深圳技术大学城市交通与物流学院
              </p>
              <p className="text-aurora-white/40 text-[10px] sm:text-xs mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span>&copy; {new Date().getFullYear()} AURORA Racing. All rights reserved.</span>
                <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-aurora-white transition-colors">
                  粤ICP备2026055616号
                </a>
                <a href="https://beian.mps.gov.cn/#/query/webSearch?code=44030002012789" target="_blank" rel="noopener noreferrer" className="hover:text-aurora-white transition-colors">
                  粤公网安备44030002012789号
                </a>
              </p>
            </div>
          </div>

          {/* Social Media Accounts (Right) */}
          <div className="flex flex-row items-center gap-3 md:gap-8 self-center md:self-end">
            <span className="text-aurora-white font-display font-bold text-lg mr-2 hidden sm:block">Connect via</span>
            <a
              href="https://www.instagram.com/_auroraracing?igsh=YW5pNW9ham85bDho&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#1f1f2e] flex items-center justify-center text-aurora-white hover:bg-aurora-purple hover:scale-110 transition-all duration-300 shadow-lg"
            >
              <Instagram size={18} className="md:w-5 md:h-5" />
            </a>
            
            <a
              href="https://v.douyin.com/oEkcT_36nZI/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#1f1f2e] flex items-center justify-center text-aurora-white hover:bg-aurora-purple hover:scale-110 transition-all duration-300 shadow-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="md:w-5 md:h-5"
              >
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
            </a>

            <a
              href="https://mp.weixin.qq.com/s/1R4bB9u1_6IFkO6a6LQT0w"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#1f1f2e] flex items-center justify-center text-aurora-white hover:bg-aurora-purple hover:scale-110 transition-all duration-300 shadow-lg outline-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 1024 1024"
                fill="currentColor"
                className="md:w-[22px] md:h-[22px]"
              >
                <path d="M690.1 377.4c5.9 0 11.8.2 17.6.5-24.4-128.7-158.3-227.1-319.9-227.1C209 150.8 64 271.4 64 420.2c0 81.1 43.6 154.2 111.9 203.6a21.5 21.5 0 0 1 9.1 17.6c0 2.4-.5 4.6-1.1 6.9-5.5 20.3-14.2 52.8-14.6 54.3-.7 2.6-1.7 5.2-1.7 7.9 0 5.9 4.8 10.8 10.8 10.8 2.3 0 4.2-.9 6.2-2l70.9-40.9c5.3-3.1 11-5 17.2-5 3.2 0 6.4.5 9.5 1.4 33.1 9.5 68.8 14.8 105.7 14.8 6 0 11.9-.1 17.8-.4-7.1-21-10.9-43.1-10.9-66 0-135.8 132.2-245.8 295.3-245.8zm-194.3-86.5c23.8 0 43.2 19.3 43.2 43.1s-19.3 43.1-43.2 43.1c-23.8 0-43.2-19.3-43.2-43.1s19.4-43.1 43.2-43.1zm-215.9 86.2c-23.8 0-43.2-19.3-43.2-43.1s19.3-43.1 43.2-43.1 43.2 19.3 43.2 43.1-19.4 43.1-43.2 43.1zm586.8 415.6c56.9-41.2 93.2-102 93.2-169.7 0-124-120.8-224.5-269.9-224.5-149 0-269.9 100.5-269.9 224.5S540.9 847.5 690 847.5c30.8 0 60.6-4.4 88.1-12.3 2.6-.8 5.2-1.2 7.9-1.2 5.2 0 9.9 1.6 14.3 4.1l59.1 34c1.7 1 3.3 1.7 5.2 1.7a9 9 0 0 0 6.4-2.6 9 9 0 0 0 2.6-6.4c0-2.2-.9-4.4-1.4-6.6-.3-1.2-7.6-28.3-12.2-45.3-.5-1.9-.9-3.8-.9-5.7.1-5.9 3.1-11.2 7.6-14.5zM600.2 587.2c-19.9 0-36-16.1-36-35.9 0-19.8 16.1-35.9 36-35.9s36 16.1 36 35.9c0 19.8-16.2 35.9-36 35.9zm179.9 0c-19.9 0-36-16.1-36-35.9 0-19.8 16.1-35.9 36-35.9s36 16.1 36 35.9a36.08 36.08 0 0 1-36 35.9z" />
              </svg>
            </a>

            <div className="relative group" ref={qrRef}>
              <button
                onClick={() => setShowStoreQR((s) => !s)}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#1f1f2e] flex items-center justify-center text-aurora-white hover:bg-aurora-purple hover:scale-110 focus:scale-110 transition-all duration-300 shadow-lg outline-none"
              >
                <ShoppingCart size={18} className="md:w-5 md:h-5" />
              </button>
              {/* Store QR Code Tooltip - supports click on mobile and hover on desktop */}
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-4 transition-all duration-100 z-50 ${showStoreQR ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'} md:group-hover:opacity-100 md:group-hover:visible md:group-hover:pointer-events-auto`}>
                <div className="bg-[#1f1f2e]/90 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-xl flex flex-col items-center">
                  <div className="w-32 h-32 md:w-40 md:h-40 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden relative">
                    <span className="text-xs text-white/50 absolute text-center px-2">请上传二维码至<br />public/images/store/qrcode.png</span>
                    <img src="/images/store/qrcode.png" alt="Purchase QR Code" className="w-full h-full object-cover relative z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1f1f2e] rotate-45 border-r border-b border-white/10"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
