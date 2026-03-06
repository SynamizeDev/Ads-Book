"use client";

import dynamic from "next/dynamic";

// ssr: false is only allowed in Client Components.
// This wrapper ensures SplashScreen is never server-rendered,
// eliminating the hydration mismatch it causes in layout.tsx.
const SplashScreen = dynamic(() => import("./SplashScreen"), { ssr: false });

export default function SplashScreenLoader() {
    return <SplashScreen />;
}
