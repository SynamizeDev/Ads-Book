import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import SidebarNav from "./components/SidebarNav";
import { ThemeProvider } from "./components/ThemeProvider";
import ThemeToggle from "./components/ThemeToggle";
import SplashScreen from "./components/SplashScreen";
import LogoutIcon from "./components/LogoutIcon";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ads Book Dashboard",
  description: "Ad Performance Monitoring",
  icons: {
    icon: [
      { url: "/app-icon.png?v=3", type: "image/png" },
    ],
    apple: [
      { url: "/app-icon.png?v=3", type: "image/png" },
    ],
  },
};

import { Account, getAgencyProfile, getAccounts as fetchAccounts, API_URL } from "@/lib/api";
import { getCachedUser } from "@/lib/supabase-server";

async function getAccounts(): Promise<Account[]> {
  try {
    const res = await fetchAccounts();
    if (res.success && res.data) return res.data;
    return [];
  } catch (e) {
    console.error("Error fetching sidebar accounts:", e);
    return [];
  }
}

async function getProfile() {
  try {
    const res = await getAgencyProfile();
    if (res.success && res.data) return res.data;
    return { name: "Agency User", id: "" };
  } catch (e) {
    return { name: "Agency User", id: "" };
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // getCachedUser() is memoized per-request via React.cache() —
  // calling it here and in page.tsx only results in one Auth round-trip
  const user = await getCachedUser();
  const userEmail = user?.email || "";
  const isAuthenticated = !!user;

  // For unauthenticated users (login page), render minimal layout
  if (!isAuthenticated) {
    return (
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/app-icon.png?v=3" type="image/png" />
          <link rel="apple-touch-icon" href="/app-icon.png?v=3" />
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem('adsbook-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`,
            }}
          />
        </head>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          {children}
        </body>
      </html>
    );
  }

  // Authenticated layout with sidebar
  const [accounts, profile] = await Promise.all([
    getAccounts(),
    getProfile()
  ]);

  const displayName = userEmail ? userEmail.split("@")[0] : profile.name;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('adsbook-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <SplashScreen />
          <div className="flex min-h-screen bg-background">
            {/* --- Sidebar --- */}
            <aside className="w-[260px] bg-sidebar-bg border-r border-sidebar-border flex flex-col flex-shrink-0 sticky top-0 h-screen z-50 overflow-hidden transition-colors duration-200">

              {/* Logo */}
              <div className="px-6 py-2 border-b bg-white border-sidebar-border/50 flex justify-center">
                <Link href="/" className="flex items-center w-fit group transition-opacity hover:opacity-90">
                  <img
                    src="/logo-light.jpeg"
                    alt="Ads Book Logo"
                    className="h-14 w-auto object-contain"
                  />
                </Link>
              </div>

              {/* Nav Items */}
              <SidebarNav accounts={accounts} />

              {/* Footer: Theme Toggle + User */}
              <div className="px-5 py-4 border-t border-sidebar-border space-y-3">
                <Link
                  href="/settings"
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-[10px] text-muted hover:text-foreground hover:bg-hover-bg transition-all text-[13px]"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </Link>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center text-background font-medium text-xs">
                      {initials}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-sidebar-bg" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-medium text-foreground truncate" title={displayName}>{displayName}</p>
                      <LogoutIcon />
                    </div>
                    <p className="text-[11px] text-muted -mt-0.5">Admin Profile</p>
                  </div>
                </div>
              </div>
            </aside>

            {/* --- Main Content --- */}
            <main className="flex-1 min-w-0 overflow-y-auto">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
