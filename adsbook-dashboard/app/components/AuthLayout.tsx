"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SidebarNav from "./SidebarNav";
import LogoutIcon from "./LogoutIcon";
import type { Account } from "@/lib/api";

interface AuthLayoutProps {
  children: React.ReactNode;
  accounts: Account[];
  displayName: string;
  initials: string;
}

export default function AuthLayout({ children, accounts, displayName, initials }: AuthLayoutProps) {
  const pathname = usePathname();

  // Branding route: no sidebar, no splash — just the branding page
  if (pathname === "/branding") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background">
        <aside className="w-[260px] bg-sidebar-bg border-r border-sidebar-border flex flex-col flex-shrink-0 sticky top-0 h-screen z-50 overflow-hidden transition-colors duration-200">
          <div className="px-6 py-2 border-b bg-white border-sidebar-border/50 flex justify-center">
            <Link href="/" className="flex items-center w-fit group transition-opacity hover:opacity-90">
              <img src="/logo-light.jpeg" alt="Ads Book Logo" className="h-14 w-auto object-contain" />
            </Link>
          </div>
          <SidebarNav accounts={accounts} />
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
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      </div>
  );
}
