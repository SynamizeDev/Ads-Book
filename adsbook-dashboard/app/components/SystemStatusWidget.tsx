"use client";

import { SystemStatus } from "@/lib/api";
import { useState, useEffect } from "react";

export default function SystemStatusWidget({ status }: { status: SystemStatus }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !status) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[60]">
            <div className="bg-card rounded-[16px] px-5 py-3.5 flex items-center gap-6 text-[13px] shadow-lg border border-border">
                <div className="flex items-center gap-5 pr-5 border-r border-border">
                    <div className="flex items-center gap-2">
                        <span className="text-muted text-xs">Meta API</span>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${status.meta_status === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className={`text-xs font-medium ${status.meta_status === 'Connected' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {status.meta_status === 'Connected' ? 'Connected' : 'Offline'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-muted text-xs">Telegram</span>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${status.telegram_status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className={`text-xs font-medium ${status.telegram_status === 'Active' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {status.telegram_status === 'Active' ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-muted text-xs">Last Sync</span>
                    <span className="text-xs font-medium text-foreground tabular-nums">{status.last_sync}</span>
                </div>
            </div>
        </div>
    );
}
