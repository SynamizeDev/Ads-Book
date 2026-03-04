"use client";

import { useState, useEffect } from "react";

export default function SplashScreen() {
    const [visible, setVisible] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        // Start fade-out after a short delay to let the page render underneath
        const timer = setTimeout(() => {
            setFadeOut(true);
        }, 1200);

        // Fully remove from DOM after animation
        const removeTimer = setTimeout(() => {
            setVisible(false);
        }, 2000);

        return () => {
            clearTimeout(timer);
            clearTimeout(removeTimer);
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-all duration-700 ${fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
        >
            <div className="flex flex-col items-center gap-5">
                {/* Logo Mark */}
                <div
                    className={`transition-all duration-700 ${fadeOut ? "scale-110 opacity-0" : "scale-100 opacity-100"
                        }`}
                >
                    <div className="w-16 h-16 bg-foreground rounded-[18px] flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold tracking-tight text-background">A</span>
                    </div>
                </div>

                {/* Brand Name */}
                <div
                    className={`text-center transition-all duration-500 delay-100 ${fadeOut ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
                        }`}
                    style={{ animationDelay: "200ms" }}
                >
                    <h1 className="text-xl font-bold text-foreground tracking-tight">Ads Book</h1>
                    <p className="text-[12px] text-muted mt-1 tracking-wider uppercase font-medium">
                        Ad Performance Monitor
                    </p>
                </div>

                {/* Loading Indicator */}
                <div
                    className={`mt-2 transition-all duration-500 ${fadeOut ? "opacity-0" : "opacity-100"
                        }`}
                >
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" style={{ animationDelay: "150ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" style={{ animationDelay: "300ms" }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
