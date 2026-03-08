"use client";

import { useState, useEffect } from "react";
import { getAlertLogs, AlertLog } from "@/lib/api";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<AlertLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [direction, setDirection] = useState(0); // -1 for prev, 1 for next
    const PAGE_SIZE = 10;

    useEffect(() => {
        async function fetchAlerts() {
            try {
                setLoading(true);
                const res = await getAlertLogs(PAGE_SIZE, page * PAGE_SIZE);
                if (res.success && res.data) {
                    setAlerts(res.data);
                    setHasMore(res.data.length === PAGE_SIZE);
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
    }, [page]);

    const handlePageChange = (newPage: number) => {
        setDirection(newPage > page ? 1 : -1);
        setPage(newPage);
    };

    if (loading && alerts.length === 0) {
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
                    <span className="text-foreground font-medium">Alert/Pause History</span>
                </nav>
            </div>

            <div className="px-10 max-w-[1400px] mx-auto space-y-8">
                <div className="pb-2">
                    <h1 className="text-[26px] font-bold text-foreground mb-1 tracking-tight">Alert/Pause History</h1>
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
                ) : (
                    <div className="space-y-8">
                        <div className="bg-card rounded-[24px] overflow-hidden shadow-sm border border-border relative min-h-[500px]">
                            {loading && (
                                <div className="absolute inset-x-0 top-0 z-10">
                                    <div className="h-[2px] w-full bg-hover-bg overflow-hidden">
                                        <div className="h-full bg-foreground animate-progress origin-left" />
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-hover-bg/50 border-b border-border">
                                            <th className="px-6 py-4 text-[11px] font-medium text-muted uppercase tracking-wider">Date <span className="normal-case font-normal opacity-80">(local)</span></th>
                                            <th className="px-6 py-4 text-[11px] font-medium text-muted uppercase tracking-wider">Account</th>
                                            <th className="px-6 py-4 text-[11px] font-medium text-muted uppercase tracking-wider">Campaign / Ad</th>
                                            <th className="px-6 py-4 text-[11px] font-medium text-muted uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-4 text-[11px] font-medium text-muted uppercase tracking-wider text-right">CPL / Threshold</th>
                                            <th className="px-6 py-4 text-[11px] font-medium text-muted uppercase tracking-wider text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border relative">
                                        <AnimatePresence mode="wait" custom={direction}>
                                            {alerts.length === 0 ? (
                                                <motion.tr
                                                    key="empty"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                >
                                                    <td colSpan={6} className="px-6 py-32 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                                                                <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            </div>
                                                            <h3 className="text-lg font-semibold text-foreground mb-1">No Alerts Found</h3>
                                                            <p className="text-[14px] text-muted">History is clear for this page.</p>
                                                            {page > 0 && (
                                                                <button onClick={() => handlePageChange(0)} className="mt-4 text-[13px] text-accent font-medium hover:underline">Return to Page 1</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ) : (
                                                <motion.tr
                                                    key={page}
                                                    custom={direction}
                                                    initial={{ opacity: 0, x: direction * 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: direction * -20 }}
                                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                                >
                                                    <td colSpan={6} className="p-0">
                                                        <table className="w-full">
                                                            <tbody className="divide-y divide-border">
                                                                {alerts.map((alert) => (
                                                                    <tr key={alert.id} className="hover:bg-hover-bg/50 transition-colors">
                                                                        <td className="px-6 py-5 whitespace-nowrap min-w-[160px]">
                                                                            <div className="text-[13px] font-medium text-foreground tabular-nums">
                                                                                {new Date(alert.created_at).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
                                                                            </div>
                                                                            <div className="text-[12px] text-muted mt-0.5 tabular-nums">
                                                                                {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-5 min-w-[120px]">
                                                                            <Link href={`/accounts/${alert.ad_account_id}`} className="text-[13px] text-accent hover:opacity-80 font-medium transition-colors">
                                                                                {alert.ad_account_id.substring(0, 8)}...
                                                                            </Link>
                                                                        </td>
                                                                        <td className="px-6 py-5">
                                                                            <div className="text-[13px] text-foreground font-medium line-clamp-1 max-w-[300px]" title={alert.campaign_name}>{alert.campaign_name}</div>
                                                                            <div className="text-[12px] text-muted mt-0.5 truncate max-w-[220px]" title={alert.ad_name}>{alert.ad_name}</div>
                                                                        </td>
                                                                        <td className="px-6 py-5 min-w-[120px]">
                                                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${alert.alert_type === 'ZERO_LEADS' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                                                {alert.alert_type === 'ZERO_LEADS' ? 'Zero Leads' : 'High CPL'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-5 text-right min-w-[150px]">
                                                                            <div className="text-[13px] font-semibold text-foreground tabular-nums">
                                                                                ${alert.alert_type === 'ZERO_LEADS' ? alert.spend.toFixed(2) : alert.calculated_cpl.toFixed(2)}
                                                                            </div>
                                                                            <div className="text-[12px] text-muted mt-0.5 tabular-nums">
                                                                                {alert.alert_type === 'ZERO_LEADS' ? 'Spend' : 'CPL'} vs ${alert.cpl_threshold}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-5 text-right min-w-[100px]">
                                                            <a
                                                                href={(() => {
                                                                    const base = "https://adsmanager.facebook.com/adsmanager/manage/ads";
                                                                    const params = new URLSearchParams();
                                                                    const acctId = alert.ad_accounts?.account_id;
                                                                    if (acctId) params.set("act", acctId);
                                                                    if (alert.campaign_meta_id) params.set("selected_campaign_ids", alert.campaign_meta_id);
                                                                    if (alert.adset_meta_id) params.set("selected_adset_ids", alert.adset_meta_id);
                                                                    const qs = params.toString();
                                                                    return qs ? `${base}?${qs}` : base;
                                                                })()}
                                                                target="_blank" rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-[13px] text-accent hover:opacity-80 font-medium transition-colors">
                                                                View <ChevronRight className="w-3.5 h-3.5" />
                                                            </a>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </motion.tr>
                                            )}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[13px] text-muted">Page</span>
                                <div className="px-3 py-1 bg-card border border-border rounded-[8px] text-[13px] font-semibold text-foreground">
                                    {page + 1}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(Math.max(0, page - 1))}
                                    disabled={page === 0 || loading}
                                    className="p-2 aspect-square rounded-[12px] border border-border text-foreground hover:bg-hover-bg disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                                    aria-label="Previous Page"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={!hasMore || loading}
                                    className="p-2 aspect-square rounded-[12px] border border-border text-foreground hover:bg-hover-bg disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                                    aria-label="Next Page"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
