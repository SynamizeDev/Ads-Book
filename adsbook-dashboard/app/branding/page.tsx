"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const FADE_IN_MS = 600;
const HOLD_MS = 1400;
const FADE_OUT_MS = 700;

export default function BrandingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase("hold"), FADE_IN_MS);
    const startOutAndNavigate = FADE_IN_MS + HOLD_MS;
    const outTimer = setTimeout(() => {
      setPhase("out");
      // Navigate as soon as fade-out starts so dashboard loads during the fade (avoids black gap)
      router.replace("/");
    }, startOutAndNavigate);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(outTimer);
    };
  }, [router]);

  const isVisible = phase === "in" || phase === "hold";
  const isFadingOut = phase === "out";

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{
        duration: phase === "in" ? FADE_IN_MS / 1000 : FADE_OUT_MS / 1000,
        ease: "easeInOut",
      }}
    >
      <div className="flex flex-col items-center gap-5">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{
            scale: isFadingOut ? 1.08 : 1,
            opacity: isFadingOut ? 0 : 1,
          }}
          transition={{
            duration: isFadingOut ? FADE_OUT_MS / 1000 : FADE_IN_MS / 1000,
            ease: "easeInOut",
          }}
        >
          <img
            src="/Group 427320665.svg"
            alt="Ads Book"
            className="w-64 h-auto object-contain"
          />
        </motion.div>

        <motion.p
          className="text-[11px] text-muted tracking-[0.2em] uppercase font-bold opacity-60 text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{
            opacity: isFadingOut ? 0 : 0.6,
            y: isFadingOut ? 4 : 0,
          }}
          transition={{ duration: 0.4, delay: phase === "in" ? 0.1 : 0 }}
        >
          Ad Performance Monitor
        </motion.p>

        <motion.div
          className="mt-2 flex items-center gap-1.5"
          animate={{ opacity: isFadingOut ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" style={{ animationDelay: "0ms" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" style={{ animationDelay: "150ms" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" style={{ animationDelay: "300ms" }} />
        </motion.div>
      </div>
    </motion.div>
  );
}
