"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
    theme: Theme;
    toggleTheme: () => void;
}>({
    theme: "dark",
    toggleTheme: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>("dark");

    useEffect(() => {
        const stored = localStorage.getItem("adsbook-theme") as Theme | null;
        const preferred = stored || "dark";
        setTheme(preferred);
        document.documentElement.classList.toggle("dark", preferred === "dark");
    }, []);

    const toggleTheme = () => {
        const next = theme === "light" ? "dark" : "light";
        setTheme(next);
        localStorage.setItem("adsbook-theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
    };

    // Always render the Provider — theme flicker is already prevented by the
    // inline <script> in layout.tsx <head> which sets the 'dark' class before
    // React hydrates. The !mounted early-return pattern causes hydration mismatches.
    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
