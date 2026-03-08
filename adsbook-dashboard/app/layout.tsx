import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import AuthLayout from "./components/AuthLayout";

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

import { Account, getAgencyProfile, getAccounts as fetchAccounts } from "@/lib/api";
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
          <AuthLayout accounts={accounts} displayName={displayName} initials={initials}>
            {children}
          </AuthLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
