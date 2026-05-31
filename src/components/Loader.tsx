import { motion } from "motion/react";

export default function Loader() {
  const text = "AURORA RACING";
  
  return (
    <motion.div 
      className="fixed inset-0 z-[9999] bg-aurora-black flex items-center justify-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
    >
      <div className="loader">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="text">
            <span>{text}</span>
          </div>
        ))}
        <div className="line"></div>
      </div>
    </motion.div>
  );
}
