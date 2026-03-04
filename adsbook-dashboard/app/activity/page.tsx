"use client";

import { useState, useEffect } from "react";
import { getActivityLogs, ActivityLog } from "@/lib/api";

const ACTION_META: Record<string, { icon: string; color: string; label: string }> = {
    THRESHOLD_UPDATE: { icon: "💰", color: "bg-blue-50 text-blue-600 dark:bg-blue-900/30", label: "Threshold Updated" },
    AUTO_PAUSE_TOGGLE: { icon: "⏸️", color: "bg-amber-50 text-amber-600 dark:bg-amber-900/30", label: "Auto-Pause Toggled" },
    ACCOUNT_CREATE: { icon: "➕", color: "bg-green-50 text-green-600 dark:bg-green-900/30", label: "Account Created" },
    ACCOUNT_UPDATE: { icon: "✏️", color: "bg-blue-50 text-blue-600 dark:bg-blue-900/30", label: "Account Updated" },
    ACCOUNT_DELETE: { icon: "🗑️", color: "bg-red-50 text-red-600 dark:bg-red-900/30", label: "Account Deleted" },
    SETTINGS_UPDATE: { icon: "⚙️", color: "bg-gray-100 text-gray-600 dark:bg-gray-800", label: "Settings Updated" },
    CAMPAIGN_THRESHOLD_SET: { icon: "🎯", color: "bg-purple-50 text-purple-600 dark:bg-purple-900/30", label: "Campaign Threshold Set" },
    WEEKLY_REPORT_SENT: { icon: "📊", color: "bg-green-50 text-green-600 dark:bg-green-900/30", label: "Weekly Report Sent" },
    AD_PAUSED: { icon: "⏸️", color: "bg-red-50 text-red-600 dark:bg-red-900/30", label: "Ad Paused" },
};

function getActionMeta(action: string) {
    return ACTION_META[action] || { icon: "📌", color: "bg-gray-100 text-gray-600 dark:bg-gray-800", label: action };
}

function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ActivityPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const res = await getActivityLogs(100);
            if (res.success && res.data) setLogs(res.data);
            setLoading(false);
        }
        load();
    }, []);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>
    );

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-[900px] mx-auto px-10 pt-10">
                <h1 className="text-[22px] font-bold text-foreground tracking-tight mb-1">Activity Log</h1>
                <p className="text-[14px] text-muted mb-10">Track all changes and system events.</p>

                {logs.length === 0 ? (
                    <div className="bg-card rounded-[20px] p-16 text-center border border-border">
                        <svg className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-[14px] font-medium text-foreground">No Activity Yet</p>
                        <p className="text-[13px] text-muted mt-1">Actions will appear here as they happen</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

                        <div className="space-y-1">
                            {logs.map((log) => {
                                const meta = getActionMeta(log.action);
                                const details = log.details as Record<string, unknown>;
                                return (
                                    <div key={log.id} className="relative pl-12 py-4 group">
                                        {/* Dot */}
                                        <div className="absolute left-3 top-5 w-3 h-3 rounded-full bg-border group-hover:bg-foreground transition-colors ring-4 ring-background" />

                                        <div className="bg-card rounded-[16px] p-5 shadow-sm border border-border hover:shadow-md transition-all">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${meta.color}`}>
                                                        {meta.icon} {meta.label}
                                                    </span>
                                                    {log.entity_id && (
                                                        <span className="text-[12px] text-muted font-mono px-2 py-1 bg-background rounded-[8px] border border-border">
                                                            {log.entity_id.length > 20 ? log.entity_id.slice(0, 20) + "…" : log.entity_id}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[12px] text-muted whitespace-nowrap tabular-nums">{formatTime(log.created_at)}</span>
                                            </div>

                                            {Object.keys(details).length > 0 && (
                                                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {Object.entries(details).map(([key, val]) => (
                                                        <div key={key} className="text-[12px] bg-background rounded-[8px] px-3 py-2 border border-border">
                                                            <span className="text-muted">{key.replace(/_/g, " ")}:</span>
                                                            <span className="text-foreground font-medium ml-1">{String(val)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
