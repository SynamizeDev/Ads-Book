"use client";

import { useState } from "react";
import Link from "next/link";

export default function QuickActions() {
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

    return (
        <div className="bg-card rounded-[20px] p-6 h-full flex flex-col shadow-sm hover:shadow-md transition-all border border-border">
            <h3 className="text-[13px] text-muted font-medium mb-5">Quick Actions</h3>

            <div className="flex flex-col gap-3 flex-1">
                <button
                    onClick={() => setIsAlertModalOpen(true)}
                    className="flex items-center gap-3 w-full p-3.5 rounded-[14px] bg-hover-bg hover:opacity-80 text-foreground transition-all"
                >
                    <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/30 rounded-[10px] flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <span className="font-medium text-[13px] block text-foreground">Create Rule</span>
                        <span className="text-[11px] text-muted">Set custom thresholds</span>
                    </div>
                </button>

                <Link
                    href="/alerts"
                    className="flex items-center gap-3 w-full p-3.5 rounded-[14px] bg-hover-bg hover:opacity-80 text-foreground transition-all"
                >
                    <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/30 rounded-[10px] flex items-center justify-center">
                        <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <span className="font-medium text-[13px] block text-foreground">View History</span>
                        <span className="text-[11px] text-muted">Past alert records</span>
                    </div>
                </Link>
            </div>

            {isAlertModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
                    <div className="bg-card rounded-[20px] p-7 w-full max-w-sm shadow-2xl border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Custom Rules</h3>
                        <p className="text-[14px] text-muted mb-7 leading-relaxed">
                            Custom alert rules are coming soon. You&apos;ll be able to define per-account thresholds and automated actions.
                        </p>
                        <div className="flex justify-end">
                            <button onClick={() => setIsAlertModalOpen(false)}
                                className="px-5 py-2 text-[13px] font-medium bg-foreground text-background rounded-[12px] hover:opacity-90 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
