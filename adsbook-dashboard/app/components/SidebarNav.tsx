"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Account } from "@/lib/api";
import { createPortal } from "react-dom";
import { useState, useEffect, useRef } from "react";
import AddAccountModal from "./AddAccountModal";
import EditAccountModal from "./EditAccountModal";
import DeleteAccountModal from "./DeleteAccountModal";
import Toast from "./Toast";

export default function SidebarNav({ accounts }: { accounts: Account[] }) {
    const pathname = usePathname();
    const router = useRouter();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAccountAdded = (account: any) => {
        setIsAddModalOpen(false);
        setToast({ message: "Account added successfully", type: "success" });
        router.refresh();
        setTimeout(() => router.push(`/accounts/${account.id}`), 100);
    };

    const handleEditSuccess = (updatedAccount: Account) => {
        setEditingAccount(null);
        setToast({ message: "Account updated", type: "success" });
        router.refresh();
    };

    const handleDeleteSuccess = (deletedAccountId: string) => {
        setDeletingAccount(null);
        setToast({ message: "Account deleted", type: "success" });
        router.refresh();
        if (pathname.includes(deletedAccountId)) router.push("/");
    };

    const navItems = [
        { href: "/", label: "Dashboard", icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>, exact: true },
        { href: "/alerts", label: "Alert History", icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>, exact: true },
        { href: "/compare", label: "Compare", icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, exact: true },
        { href: "/activity", label: "Activity", icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, exact: true },
    ];

    const toolsItems = [
        { href: "/tools/text-formatter", label: "Text Formatter", icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
        { href: "https://www.facebook.com/ads/library", label: "Ads Library", icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, external: true },
    ];

    return (
        <>
            <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
                <div className="space-y-1">
                    <p className="text-[11px] font-medium text-muted uppercase tracking-wider px-3 mb-3">Main</p>
                    {navItems.map((item) => {
                        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-all text-[13px] ${isActive
                                    ? "bg-foreground text-background font-medium shadow-sm"
                                    : "text-muted hover:text-foreground hover:bg-hover-bg"
                                    }`}
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                <div className="space-y-1">
                    <p className="text-[11px] font-medium text-muted uppercase tracking-wider px-3 mb-3">Tools</p>
                    {toolsItems.map((item) => (
                        <a
                            key={item.href}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-all text-[13px] text-muted hover:text-foreground hover:bg-hover-bg group"
                        >
                            {item.icon}
                            <span className="flex-1">{item.label}</span>
                            <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    ))}
                </div>

                <div className="space-y-1">
                    <p className="text-[11px] font-medium text-muted uppercase tracking-wider px-3 mb-3">Accounts</p>
                    <div className="space-y-0.5" ref={menuRef}>
                        {accounts.length > 0 ? (
                            accounts.map((account) => {
                                const isActive = pathname.includes(`/accounts/${account.id}`);
                                const isMenuOpen = openMenuId === account.id;
                                return (
                                    <div key={account.id} className="relative group/item">
                                        <Link
                                            href={`/accounts/${account.id}`}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-all text-[13px] ${isActive
                                                ? "bg-accent-light text-accent font-medium"
                                                : "text-muted hover:text-foreground hover:bg-hover-bg"
                                                }`}
                                        >
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-accent' : 'bg-border'}`} />
                                            <span className="truncate" title={account.account_name}>{account.account_name}</span>
                                        </Link>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault(); e.stopPropagation();
                                                if (isMenuOpen) { setOpenMenuId(null); }
                                                else {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setDropdownPosition({ top: rect.top, left: rect.right + 8 });
                                                    setOpenMenuId(account.id);
                                                }
                                            }}
                                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-[8px] text-muted hover:text-foreground hover:bg-hover-bg opacity-0 group-hover/item:opacity-100 transition-all ${isMenuOpen ? "opacity-100 bg-hover-bg" : ""}`}
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                        </button>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="px-3 py-3 text-xs text-muted italic">No accounts yet</p>
                        )}
                    </div>
                </div>

                {openMenuId && dropdownPosition && createPortal(
                    <div ref={menuRef} style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                        className="fixed w-44 bg-card rounded-[14px] shadow-xl border border-border z-[9999] overflow-hidden text-[13px]">
                        <div className="p-1.5">
                            <Link href={`/accounts/${accounts.find(a => a.id === openMenuId)?.id}`} onClick={() => setOpenMenuId(null)}
                                className="flex items-center gap-2.5 px-3 py-2 text-foreground hover:bg-hover-bg rounded-[10px] transition-colors">
                                <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                View Details
                            </Link>
                            <button onClick={() => { setEditingAccount(accounts.find(a => a.id === openMenuId) || null); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-foreground hover:bg-hover-bg rounded-[10px] transition-colors text-left">
                                <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Edit
                            </button>
                            <div className="h-px bg-border my-1" />
                            <button onClick={() => { setDeletingAccount(accounts.find(a => a.id === openMenuId) || null); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-danger hover:bg-danger-light rounded-[10px] transition-colors text-left">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete
                            </button>
                        </div>
                    </div>,
                    document.body
                )}

                <div className="px-1">
                    <button onClick={() => setIsAddModalOpen(true)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] border border-dashed border-border text-muted hover:border-foreground hover:text-foreground hover:bg-hover-bg transition-all text-[13px]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        <span className="font-medium">Add Account</span>
                    </button>
                </div>
            </nav>

            <AddAccountModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={handleAccountAdded} />
            <EditAccountModal isOpen={!!editingAccount} onClose={() => setEditingAccount(null)} onSuccess={handleEditSuccess} account={editingAccount} />
            <DeleteAccountModal isOpen={!!deletingAccount} onClose={() => setDeletingAccount(null)} onSuccess={handleDeleteSuccess} account={deletingAccount} />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
