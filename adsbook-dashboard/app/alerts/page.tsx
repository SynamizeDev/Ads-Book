"use client";

import { useState, useEffect } from "react";
import { getAlertLogs, AlertLog } from "@/lib/api";
import Link from "next/link";

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<AlertLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchAlerts() {
            try {
                setLoading(true);
                const res = await getAlertLogs(100);
                if (res.success && res.data) {
                    setAlerts(res.data);
                } else {
                    setError(res.error || "Failed to fetch alerts");
                }
            } catch (err) {
                setError("An unexpected error occurred");
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchAlerts();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
                    <p className="text-[13px] text-muted">Loading alerts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-[1400px] mx-auto px-10 pt-8">
                <nav className="flex items-center gap-2 text-[13px] text-muted mb-8">
                    <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">Alert History</span>
                </nav>
            </div>

            <div className="px-10 max-w-[1400px] mx-auto space-y-8">
                <div className="pb-2">
                    <h1 className="text-[26px] font-bold text-foreground mb-1 tracking-tight">Alert History</h1>
                    <p className="text-[14px] text-muted">Historical performance alerts and exceptions</p>
                </div>

                {error ? (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 p-6 rounded-[20px] flex items-center gap-4">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="font-medium text-[14px]">Error loading alerts</p>
                            <p className="text-[13px] text-red-600 dark:text-red-400 mt-0.5">{error}</p>
                        </div>
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-[20px] p-14 text-center">
                        <div className="flex flex-col items-center">
                            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-1">No Alerts</h3>
                            <p className="text-[14px] text-green-600 dark:text-green-400">No alert history found</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-card rounded-[20px] overflow-hidden shadow-sm border border-border">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-hover-bg border-b border-border">
                                        <th className="px-6 py-4 text-[11px] font-medium text-muted uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-[11px] font-medium text-muted uppercase tracking-wider">Account</th>
                                        <th className="px-6 py-4 text-[11px] font-medium text-muted uppercase tracking-wider">Campaign / Ad</th>
                                        <th className="px-6 py-4 text-[11px] font-medium text-muted uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-4 text-[11px] font-medium text-muted uppercase tracking-wider text-right">CPL / Threshold</th>
                                        <th className="px-6 py-4 text-[11px] font-medium text-muted uppercase tracking-wider text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {alerts.map((alert) => (
                                        <tr key={alert.id} className="hover:bg-hover-bg transition-colors">
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="text-[13px] font-medium text-foreground tabular-nums">
                                                    {new Date(alert.created_at).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
                                                </div>
                                                <div className="text-[12px] text-muted mt-0.5 tabular-nums">
                                                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <Link href={`/accounts/${alert.ad_account_id}`} className="text-[13px] text-accent hover:opacity-80 font-medium transition-colors">
                                                    {alert.ad_account_id.substring(0, 8)}...
                                                </Link>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-[13px] text-foreground font-medium" title={alert.campaign_name}>{alert.campaign_name}</div>
                                                <div className="text-[12px] text-muted mt-0.5 truncate max-w-[220px]" title={alert.ad_name}>{alert.ad_name}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${alert.alert_type === 'ZERO_LEADS' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                    {alert.alert_type === 'ZERO_LEADS' ? 'Zero Leads' : 'High CPL'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="text-[13px] font-semibold text-foreground tabular-nums">${alert.calculated_cpl.toFixed(2)}</div>
                                                <div className="text-[12px] text-muted mt-0.5 tabular-nums">Threshold: ${alert.cpl_threshold}</div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <a href="https://business.facebook.com/adsmanager" target="_blank" rel="noopener noreferrer"
                                                    className="text-[13px] text-accent hover:opacity-80 font-medium transition-colors">
                                                    View ↗
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
