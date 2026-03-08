"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    getAccounts,
    getAccountCplLogs,
    getAccountAlerts,
    updateAccountThreshold,
    toggleAutoPause,
    toggleWeeklyReport,
    getAccountBudget,
    getCampaignThresholds,
    updateAccount,
    Account,
    CplLog,
    AlertLog,
    BudgetInfo,
    CampaignThreshold
} from "@/lib/api";
import RefreshTrigger from "../../components/RefreshTrigger";
import Link from "next/link";
import Toast from "../../components/Toast";
import BudgetProgress from "../../components/BudgetProgress";
import CampaignThresholdEditor from "../../components/CampaignThresholdEditor";

type AdStatus = "CRITICAL" | "ALERT" | "RISK" | "HEALTHY";
type AdNode = CplLog & { status: AdStatus; threshold: number };

interface AdSetNode {
    name: string; ads: AdNode[];
    spend: number; leads: number; avgCpl: number;
}

interface CampaignNode {
    name: string; adSets: { [key: string]: AdSetNode };
    spend: number; leads: number; avgCpl: number;
}

function StatusBadge({ status }: { status: AdStatus }) {
    const styles = {
        CRITICAL: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
        ALERT: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        RISK: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
        HEALTHY: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    };
    const labels = { CRITICAL: "Zero Leads", ALERT: "High CPL", RISK: "At Risk", HEALTHY: "Healthy" };
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${styles[status]}`}>
            {labels[status]}
        </span>
    );
}

/* ────── Auto-Pause Toggle ────── */
function AutoPauseToggle({ account, onToggle, compact = false }: { account: Account; onToggle: (enabled: boolean) => void; compact?: boolean }) {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const enabled = account.auto_pause_enabled;

    const handleToggle = async () => {
        setLoading(true);
        try {
            const res = await toggleAutoPause(account.account_id, !enabled);
            if (res.success) {
                onToggle(!enabled);
                setToast({ message: `Auto-pause ${!enabled ? "enabled" : "disabled"}`, type: "success" });
            } else {
                setToast({ message: res.error || "Failed to update", type: "error" });
            }
        } catch {
            setToast({ message: "Network error", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    // Compact mode: just the toggle button, no card wrapper
    if (compact) {
        return (
            <>
                <button
                    onClick={handleToggle}
                    disabled={loading}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none ${enabled ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-border'} ${loading ? 'opacity-60' : ''}`}
                    aria-label="Toggle auto-pause"
                >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            </>
        );
    }

    return (
        <div className={`relative bg-card rounded-[20px] p-6 shadow-sm hover:shadow-md transition-all duration-500 border row-span-2 flex flex-col justify-between overflow-hidden group ${enabled ? 'border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.05)]' : 'border-border'
            }`}>
            {/* 🔹 Background Reactive Glow */}
            {enabled && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-[40px] rounded-full -mr-16 -mt-16 pointer-events-none" />
            )}

            <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 ${enabled ? 'bg-green-500/10 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-hover-bg text-muted'}`}>
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                    </div>
                </div>
                <button
                    onClick={handleToggle}
                    disabled={loading}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none ${enabled ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-border'} ${loading ? 'opacity-60' : ''}`}
                    aria-label="Toggle auto-pause"
                >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                    <p className={`text-[15px] font-bold tracking-tight uppercase ${enabled ? 'text-green-500' : 'text-muted'}`}>
                        {enabled ? "Auto Pause Ad" : "Pause Off"}
                    </p>
                    {enabled && (
                        <span className="flex h-2 w-2 rounded-full bg-green-500 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        </span>
                    )}
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-2">
                    {enabled ? "Enabled" : "Paused"}
                </h3>
                <p className="text-[11px] text-muted leading-relaxed max-w-[140px]">
                    {enabled
                        ? "Active guard monitoring CPL thresholds for automated pausing."
                        : "Manual mode active. No ads will be paused automatically."}
                </p>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}

/* ────── Weekly Report Toggle ────── */
function WeeklyReportToggle({ account, onToggle }: { account: Account; onToggle: (enabled: boolean) => void }) {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const enabled = account.include_in_weekly_report ?? true;

    const handleToggle = async () => {
        setLoading(true);
        try {
            const res = await toggleWeeklyReport(account.account_id, !enabled);
            if (res.success) {
                onToggle(!enabled);
                setToast({ message: `Weekly report ${!enabled ? "enabled" : "disabled"}`, type: "success" });
            } else {
                setToast({ message: res.error || "Failed to update", type: "error" });
            }
        } catch {
            setToast({ message: "Network error", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={handleToggle}
                disabled={loading}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none ${enabled ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-border'} ${loading ? 'opacity-60' : ''}`}
                aria-label="Toggle weekly report"
            >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}

/* ────── Account Links Control ────── */
function AccountLinksControl({ account, onUpdate }: { account: Account; onUpdate: (id: string, drive?: string, sheet?: string) => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [driveLink, setDriveLink] = useState(account.drive_link || "");
    const [sheetLink, setSheetLink] = useState(account.sheet_link || "");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await updateAccount(account.id, {
                name: account.account_name,
                cpl_threshold: account.cpl_threshold,
                drive_link: driveLink,
                sheet_link: sheetLink
            });
            if (res.success) {
                onUpdate(account.id, driveLink, sheetLink);
                setIsEditing(false);
                setToast({ message: "Links updated", type: "success" });
            } else {
                setToast({ message: res.error || "Failed", type: "error" });
            }
        } catch {
            setToast({ message: "Network error", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    if (isEditing) {
        return (
            <div className="bg-card border-2 border-blue-200 p-6 rounded-[20px] shadow-md col-span-1 md:col-span-2 flex flex-col">
                <p className="text-[13px] text-muted font-medium mb-4">Edit Account Links</p>
                <div className="space-y-4">
                    <div>
                        <label className="text-[11px] text-muted uppercase font-semibold mb-1 block">Google Drive Folder</label>
                        <input
                            type="text"
                            value={driveLink}
                            onChange={(e) => setDriveLink(e.target.value)}
                            placeholder="Paste Drive link here..."
                            className="w-full bg-hover-bg border border-border rounded-[10px] px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] text-muted uppercase font-semibold mb-1 block">Google Sheet</label>
                        <input
                            type="text"
                            value={sheetLink}
                            onChange={(e) => setSheetLink(e.target.value)}
                            placeholder="Paste Sheet link here..."
                            className="w-full bg-hover-bg border border-border rounded-[10px] px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-5">
                    <button onClick={() => { setIsEditing(false); setDriveLink(account.drive_link || ""); setSheetLink(account.sheet_link || ""); }}
                        className="text-[13px] text-muted hover:text-foreground px-4 py-2" disabled={loading}>
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={loading}
                        className="bg-foreground text-white text-[13px] font-medium px-5 py-2 rounded-[10px] hover:bg-gray-800 transition-colors disabled:opacity-50">
                        {loading ? "Saving..." : "Save Links"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-[20px] p-6 shadow-sm border border-border col-span-1 md:col-span-2 flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <p className="text-[13px] text-muted font-medium">Account Assets</p>
                <button onClick={() => setIsEditing(true)} className="text-muted hover:text-foreground p-1.5 rounded-[10px] hover:bg-hover-bg transition-colors" title="Edit Assets">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3 flex-1">
                {/* 🔹 Google Drive Folder */}
                <a
                    href={account.drive_link || "#"}
                    target={account.drive_link ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className={`group relative flex items-center gap-4 p-4 rounded-[16px] border transition-all duration-300 ${account.drive_link
                        ? 'bg-blue-50/10 border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-50/20 text-foreground'
                        : 'bg-hover-bg/30 border-dashed border-border text-muted cursor-not-allowed'
                        }`}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${account.drive_link ? 'bg-blue-500/10 text-blue-500' : 'bg-hover-bg/50'}`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.71 3.502L1.15 15l3.446 6.002L11.156 9.502H7.71zM9.73 15l3.444 6.002h13.104L19.715 15H9.73zM12.87 3.502l6.85 11.908L23.144 15 16.29 3.502h-3.42z" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-bold tracking-tight">Drive</p>
                        <p className="text-[11px] text-muted truncate">{account.drive_link ? "Open Assets" : "N/A"}</p>
                    </div>
                    {account.drive_link && (
                        <svg className="absolute top-3 right-3 w-3 h-3 text-blue-500/50 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    )}
                </a>

                {/* 🔹 Google Sheets Link */}
                <a
                    href={account.sheet_link || "#"}
                    target={account.sheet_link ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className={`group relative flex items-center gap-4 p-4 rounded-[16px] border transition-all duration-300 ${account.sheet_link
                        ? 'bg-green-50/10 border-green-500/20 hover:border-green-500/40 hover:bg-green-50/20 text-foreground'
                        : 'bg-hover-bg/30 border-dashed border-border text-muted cursor-not-allowed'
                        }`}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${account.sheet_link ? 'bg-green-500/10 text-green-500' : 'bg-hover-bg/50'}`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 4h7v5h5v11H6V4z" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-bold tracking-tight">Sheet</p>
                        <p className="text-[11px] text-muted truncate">{account.sheet_link ? "Open Report" : "N/A"}</p>
                    </div>
                    {account.sheet_link && (
                        <svg className="absolute top-3 right-3 w-3 h-3 text-green-500/50 group-hover:text-green-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    )}
                </a>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}

/* ────── CPL Threshold Control ────── */
function CplThresholdControl({ account, onUpdate }: { account: Account; onUpdate: (id: string, newVal: number) => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(account.cpl_threshold.toString());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(false), 2000); return () => clearTimeout(t); } }, [success]);

    const handleSave = async () => {
        const numVal = parseFloat(value);
        if (isNaN(numVal) || numVal <= 0) { setError("Invalid value"); return; }
        setLoading(true); setError(null);
        try {
            const response = await updateAccountThreshold(account.account_id, numVal);
            if (response.success && response.data) { onUpdate(account.id, response.data.newThreshold); setIsEditing(false); setSuccess(true); }
            else { setError(response.error || "Failed"); }
        } catch { setError("Error updating"); }
        finally { setLoading(false); }
    };

    if (isEditing) {
        return (
            <div className="bg-card border-2 border-blue-200 p-6 rounded-[20px] shadow-md">
                <p className="text-[13px] text-muted font-medium mb-3">Adjust CPL Threshold</p>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-muted font-medium text-lg">$</span>
                    <input type="number" value={value} onChange={(e) => setValue(e.target.value)}
                        className="w-full border-b-2 border-border focus:border-blue-500 outline-none font-bold text-2xl text-foreground py-1 tabular-nums bg-transparent"
                        autoFocus />
                </div>
                {error && <p className="text-[12px] text-red-500 mb-2">{error}</p>}
                <div className="flex items-center justify-end gap-2 mt-4">
                    <button onClick={() => { setIsEditing(false); setValue(account.cpl_threshold.toString()); setError(null); }}
                        className="text-[13px] text-muted hover:text-foreground px-4 py-2 rounded-[10px] transition-colors" disabled={loading}>
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={loading}
                        className="bg-foreground text-white text-[13px] font-medium px-5 py-2 rounded-[10px] hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2">
                        {loading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Save"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-card rounded-[20px] p-6 transition-all shadow-sm hover:shadow-md border ${success ? 'border-green-200' : 'border-border'} h-full`}>
            <div className="flex justify-between items-start mb-2">
                <p className="text-[13px] text-muted font-medium">CPL Threshold</p>
                <button onClick={() => setIsEditing(true)} className="text-muted hover:text-foreground transition-colors p-1 rounded-[8px] hover:bg-hover-bg" title="Edit Threshold">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
            </div>
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-foreground tabular-nums">${account.cpl_threshold}</h3>
                {success && <span className="text-[12px] text-green-600 font-medium">Updated ✓</span>}
            </div>
        </div>
    );
}

/* ────── Account Alert History ────── */
const ALERTS_PER_PAGE = 10;

function AccountAlertHistory({ accountId }: { accountId: string }) {
    const [alerts, setAlerts] = useState<AlertLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    useEffect(() => {
        async function load() {
            try {
                const res = await getAccountAlerts(accountId, 100);
                if (res.success && res.data) setAlerts(res.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        }
        load();
    }, [accountId]);

    if (loading) {
        return (
            <div className="bg-card rounded-[20px] p-10 border border-border text-center">
                <div className="w-6 h-6 border-2 border-border border-t-gray-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[13px] text-muted">Loading alert history...</p>
            </div>
        );
    }

    if (alerts.length === 0) {
        return (
            <div className="bg-green-50 rounded-[20px] p-10 border border-green-100 text-center">
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-[14px] font-medium text-green-700">No Alerts</p>
                    <p className="text-[13px] text-green-600 mt-0.5">This account has no alert history</p>
                </div>
            </div>
        );
    }

    const totalPages = Math.ceil(alerts.length / ALERTS_PER_PAGE);
    const start = (page - 1) * ALERTS_PER_PAGE;
    const pageAlerts = alerts.slice(start, start + ALERTS_PER_PAGE);

    return (
        <div className="bg-card rounded-[20px] overflow-hidden shadow-sm border border-border">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-hover-bg border-b border-border">
                            <th className="px-6 py-3.5 text-[11px] font-medium text-muted uppercase tracking-wider">Date <span className="normal-case font-normal opacity-80">(local)</span></th>
                            <th className="px-6 py-3.5 text-[11px] font-medium text-muted uppercase tracking-wider">Campaign / Ad</th>
                            <th className="px-6 py-3.5 text-[11px] font-medium text-muted uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3.5 text-[11px] font-medium text-muted uppercase tracking-wider text-right">CPL</th>
                            <th className="px-6 py-3.5 text-[11px] font-medium text-muted uppercase tracking-wider text-right">Spend</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {pageAlerts.map((alert) => (
                            <tr key={alert.id} className="hover:bg-hover-bg transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-[13px] font-medium text-foreground tabular-nums">
                                        {new Date(alert.created_at).toLocaleDateString([], { month: 'short', day: '2-digit' })}
                                    </div>
                                    <div className="text-[11px] text-muted mt-0.5 tabular-nums">
                                        {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-[13px] text-foreground font-medium truncate max-w-[200px]" title={alert.campaign_name}>{alert.campaign_name}</div>
                                    <div className="text-[11px] text-muted mt-0.5 truncate max-w-[200px]" title={alert.ad_name}>{alert.ad_name}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${alert.alert_type === 'ZERO_LEADS' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {alert.alert_type === 'ZERO_LEADS' ? 'Zero Leads' : 'High CPL'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-[13px] font-semibold text-foreground tabular-nums">
                                    ${alert.calculated_cpl.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right text-[13px] text-muted tabular-nums">
                                    ${alert.spend.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-hover-bg">
                <p className="text-[12px] text-muted tabular-nums">
                    Showing <span className="font-medium text-foreground">{start + 1}–{Math.min(start + ALERTS_PER_PAGE, alerts.length)}</span> of <span className="font-medium text-foreground">{alerts.length}</span> alerts
                </p>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setPage(1)}
                        disabled={page === 1}
                        className="p-1.5 rounded-[8px] text-muted hover:text-foreground hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="First page"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1.5 rounded-[8px] text-muted hover:text-foreground hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Previous page"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Page number pills */}
                    <div className="flex items-center gap-1 mx-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                            .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((item, idx) =>
                                item === "…" ? (
                                    <span key={`ellipsis-${idx}`} className="w-8 text-center text-[12px] text-muted">…</span>
                                ) : (
                                    <button
                                        key={item}
                                        onClick={() => setPage(item as number)}
                                        className={`w-8 h-8 rounded-[8px] text-[12px] font-medium transition-colors ${page === item ? 'bg-foreground text-background' : 'text-muted hover:text-foreground hover:bg-card'}`}
                                    >
                                        {item}
                                    </button>
                                )
                            )}
                    </div>

                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-1.5 rounded-[8px] text-muted hover:text-foreground hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Next page"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setPage(totalPages)}
                        disabled={page === totalPages}
                        className="p-1.5 rounded-[8px] text-muted hover:text-foreground hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Last page"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ────── Main Page ────── */
export default function AccountPage() {
    const params = useParams();
    const router = useRouter();
    const accountId = params?.accountId as string;

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [cplLogs, setCplLogs] = useState<CplLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [budget, setBudget] = useState<BudgetInfo | null>(null);
    const [campaignThresholds, setCampaignThresholds] = useState<CampaignThreshold[]>([]);
    const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

    const toggleItem = (id: string) => { const s = new Set(collapsedItems); if (s.has(id)) s.delete(id); else s.add(id); setCollapsedItems(s); };
    const isCollapsed = (id: string) => collapsedItems.has(id);
    const handleThresholdUpdate = (id: string, newVal: number) => { setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, cpl_threshold: newVal } : acc)); };
    const handleAutoPauseToggle = (enabled: boolean) => {
        setAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, auto_pause_enabled: enabled } : acc));
    };
    const handleWeeklyReportToggle = (enabled: boolean) => {
        setAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, include_in_weekly_report: enabled } : acc));
    };

    const handleLinksUpdate = (id: string, drive?: string, sheet?: string) => {
        setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, drive_link: drive, sheet_link: sheet } : acc));
    };

    const handleCampaignThresholdUpdate = (name: string, newVal: number) => {
        setCampaignThresholds(prev => {
            const existing = prev.find(t => t.campaign_name === name);
            if (existing) return prev.map(t => t.campaign_name === name ? { ...t, cpl_threshold: newVal } : t);
            return [...prev, { id: 'temp', ad_account_id: accountId, campaign_name: name, cpl_threshold: newVal }];
        });
    };

    useEffect(() => {
        async function fetchData() {
            if (!accountId) return;
            try {
                setLoading(true);
                const accountsResponse = await getAccounts();
                const fetchedAccounts = accountsResponse.data || [];
                if (accountsResponse.success) {
                    setAccounts(fetchedAccounts);
                    // accountId from URL is the internal UUID (id), NOT the Meta account_id
                    const matchedAccount = fetchedAccounts.find(a => a.id === accountId);
                    if (!matchedAccount) { router.push("/"); return; }

                    // Use the Meta Account ID for all API calls
                    const metaAccountId = matchedAccount.account_id;

                    const [logsResponse, budgetRes, threshRes] = await Promise.all([
                        getAccountCplLogs(metaAccountId, 100),
                        getAccountBudget(metaAccountId),
                        getCampaignThresholds(metaAccountId)
                    ]);

                    if (logsResponse.success) { setCplLogs(logsResponse.data || []); setLastUpdated(new Date()); }
                    if (budgetRes.success) setBudget(budgetRes.data || null);
                    if (threshRes.success) setCampaignThresholds(threshRes.data || []);
                }
            } catch (err) { console.error("Failed to fetch data", err); }
            finally { setLoading(false); }
        }
        fetchData();
    }, [accountId, router]);

    const { hierarchy, flatAds, summary } = useMemo(() => {
        const campaigns: { [key: string]: CampaignNode } = {};
        const processedAdIds = new Set<string>();
        const allAds: AdNode[] = [];

        const sortedLogs = [...cplLogs].sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime());

        if (sortedLogs.length > 0) {
            const latestTime = new Date(sortedLogs[0].checked_at).getTime();
            const cutoff = latestTime - (20 * 1000);
            // Only show ads from the most recent engine run (within 20s of latest entry)
            const freshLogs = sortedLogs.filter(log => new Date(log.checked_at).getTime() > cutoff);

            for (const log of freshLogs) {
                if (processedAdIds.has(log.ad_meta_id)) continue;
                processedAdIds.add(log.ad_meta_id);
                const account = accounts.find(a => a.id === log.ad_account_id);
                // Use campaign-specific threshold if available, otherwise account default
                const campThreshold = campaignThresholds.find(t => t.campaign_name === log.campaign_name)?.cpl_threshold;
                const threshold = campThreshold || account?.cpl_threshold || 40;

                let status: AdStatus = "HEALTHY";
                if (log.leads === 0 && log.spend >= threshold) status = "CRITICAL";
                else if (log.calculated_cpl > threshold) status = "ALERT";
                else if (log.calculated_cpl > threshold * 0.7) status = "RISK";
                const adNode: AdNode = { ...log, status, threshold };
                allAds.push(adNode);

                if (!campaigns[log.campaign_name]) campaigns[log.campaign_name] = { name: log.campaign_name, adSets: {}, spend: 0, leads: 0, avgCpl: 0 };
                const camp = campaigns[log.campaign_name];
                if (!camp.adSets[log.adset_name]) camp.adSets[log.adset_name] = { name: log.adset_name, ads: [], spend: 0, leads: 0, avgCpl: 0 };
                const adSet = camp.adSets[log.adset_name];
                adSet.ads.push(adNode); adSet.spend += log.spend; adSet.leads += log.leads; camp.spend += log.spend; camp.leads += log.leads;
            }
        }

        const sortedCampaigns = Object.values(campaigns).map(camp => {
            camp.avgCpl = camp.leads > 0 ? camp.spend / camp.leads : 0;
            const sortedAdSets = Object.values(camp.adSets).map(set => {
                set.avgCpl = set.leads > 0 ? set.spend / set.leads : 0;
                set.ads.sort((a, b) => {
                    const score = (s: AdStatus) => ({ CRITICAL: 4, ALERT: 3, RISK: 2, HEALTHY: 1 }[s]);
                    return (score(b.status) - score(a.status)) || (b.calculated_cpl - a.calculated_cpl);
                });
                return set;
            }).sort((a, b) => b.spend - a.spend);
            camp.adSets = {}; sortedAdSets.forEach(s => camp.adSets[s.name] = s);
            return camp;
        }).sort((a, b) => b.spend - a.spend);

        return {
            hierarchy: sortedCampaigns, flatAds: allAds,
            summary: {
                totalActiveAds: allAds.length,
                adsInAlert: allAds.filter(a => a.status === "CRITICAL" || a.status === "ALERT").length,
                worstCpl: Math.max(...allAds.map(a => a.calculated_cpl), 0),
                totalSpend: allAds.reduce((sum, a) => sum + a.spend, 0),
            }
        };
    }, [cplLogs, accounts, campaignThresholds]);

    const top3WorstAds = [...flatAds].sort((a, b) => {
        if (a.status === "CRITICAL" && b.status !== "CRITICAL") return -1;
        if (b.status === "CRITICAL" && a.status !== "CRITICAL") return 1;
        return b.calculated_cpl - a.calculated_cpl;
    }).slice(0, 3);



    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-border border-t-gray-600 rounded-full animate-spin" />
                    <p className="text-[13px] text-muted">Loading account data...</p>
                </div>
            </div>
        );
    }

    const currentAccount = accounts.find(a => a.id === accountId);

    return (
        <div className="min-h-screen pb-20">
            <RefreshTrigger intervalMs={300000} />

            <div className="max-w-[1400px] mx-auto px-10 pt-8">
                <nav className="flex items-center gap-2 text-[13px] text-muted mb-6">
                    <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">Account Details</span>
                </nav>
            </div>

            {/* Account Header */}
            <div className="max-w-[1400px] mx-auto px-10 mb-10">
                <div className="bg-card rounded-[20px] p-7 shadow-sm border border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="w-13 h-13 bg-hover-bg rounded-[14px] flex items-center justify-center">
                                <svg className="w-6 h-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-[22px] font-bold text-foreground tracking-tight">{currentAccount?.account_name || "Loading..."}</h1>
                                    <span className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 border border-green-100 dark:border-green-800">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active
                                    </span>
                                    {currentAccount?.auto_pause_enabled && (
                                        <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 border border-blue-100 dark:border-blue-800">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                            Auto-Pause On
                                        </span>
                                    )}
                                </div>
                                <p className="text-[13px] text-muted">ID: <span className="font-mono">{accountId}</span></p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[12px] text-muted mb-1">Last Updated <span className="opacity-80">(local)</span></p>
                            <p className="text-[13px] font-medium text-foreground tabular-nums">
                                {lastUpdated?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) || "--:--:--"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-10 space-y-10">

                {/* Summary Cards — now includes Auto-Pause Toggle */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                    {currentAccount && <CplThresholdControl account={currentAccount} onUpdate={handleThresholdUpdate} />}

                    {/* 🔹 Active Ads Card (Prominent) */}
                    <div className="bg-card rounded-[20px] p-6 shadow-sm hover:shadow-md transition-all border border-border h-full">
                        <p className="text-[13px] text-muted font-medium mb-2">Active Ads</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold tabular-nums text-foreground">{summary.totalActiveAds}</h3>
                            <span className="text-[11px] text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full font-semibold">Live</span>
                        </div>
                        <p className="text-[11px] text-muted mt-2 leading-snug">Monitoring live performance</p>
                    </div>

                    {currentAccount && <AccountLinksControl account={currentAccount} onUpdate={handleLinksUpdate} />}

                    {/* Alerts + Auto-Pause combined card */}
                    {currentAccount && (
                        <div className="bg-card rounded-[20px] p-6 shadow-sm hover:shadow-md transition-all border border-border space-y-4 h-full">
                            {/* Alerts */}
                            <div>
                                <p className="text-[13px] text-muted font-medium mb-2">Alerts</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className={`text-3xl font-bold tabular-nums ${summary.adsInAlert > 0 ? "text-red-600" : "text-foreground"}`}>{summary.adsInAlert}</h3>
                                    <span className="text-[12px] text-muted">active</span>
                                </div>
                                <p className="text-[11px] text-muted mt-1 leading-snug">Urgent issues detected</p>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-border" />

                            {/* Compact Auto-Pause row */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[13px] text-muted font-medium">Auto-Pause</p>
                                    <p className={`text-[11px] font-semibold mt-0.5 ${currentAccount.auto_pause_enabled ? "text-green-500" : "text-muted"}`}>
                                        {currentAccount.auto_pause_enabled ? "Enabled" : "Disabled"}
                                    </p>
                                </div>
                                <AutoPauseToggle account={currentAccount} onToggle={handleAutoPauseToggle} compact />
                            </div>

                            <div className="border-t border-border" />

                            {/* Weekly Report row */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[13px] text-muted font-medium">Weekly Report</p>
                                    <p className={`text-[11px] font-semibold mt-0.5 ${(currentAccount.include_in_weekly_report ?? true) ? "text-green-500" : "text-muted"}`}>
                                        {(currentAccount.include_in_weekly_report ?? true) ? "Included" : "Excluded"}
                                    </p>
                                </div>
                                <WeeklyReportToggle account={currentAccount} onToggle={handleWeeklyReportToggle} />
                            </div>
                        </div>
                    )}

                    {budget && <BudgetProgress budget={budget} />}


                </div>


                {/* Top 3 Worst Ads */}
                {top3WorstAds.length > 0 && (
                    <section className="space-y-5">
                        <h2 className="text-[17px] font-semibold text-foreground">Live Ads</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {top3WorstAds.map((ad, i) => (
                                <div key={ad.ad_meta_id} className={`bg-card rounded-[20px] p-6 shadow-sm hover:shadow-md transition-all border ${ad.status === 'CRITICAL' ? 'border-l-4 border-l-red-500 border-border' :
                                    ad.status === 'ALERT' ? 'border-l-4 border-l-amber-400 border-border' : 'border-border'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[12px] text-muted font-medium">#{i + 1}</span>
                                        <StatusBadge status={ad.status} />
                                    </div>
                                    <h3 className="text-[14px] font-semibold text-foreground line-clamp-2 leading-snug mb-1" title={ad.ad_name}>{ad.ad_name}</h3>
                                    <p className="text-[12px] text-muted truncate mb-5" title={ad.campaign_name}>{ad.campaign_name}</p>
                                    <div className="pt-4 border-t border-border grid grid-cols-3 gap-3 text-center">
                                        {[
                                            { label: "CPL", value: `$${ad.calculated_cpl.toFixed(2)}`, color: ad.status === "CRITICAL" || ad.status === "ALERT" ? "text-red-600" : "text-foreground" },
                                            { label: "Spend", value: `$${ad.spend.toFixed(0)}`, color: "text-foreground" },
                                            { label: "Leads", value: ad.leads.toString(), color: "text-foreground" },
                                        ].map((m) => (
                                            <div key={m.label}>
                                                <p className="text-[11px] text-muted mb-1">{m.label}</p>
                                                <p className={`text-[14px] font-bold tabular-nums ${m.color}`}>{m.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Hierarchy Table */}
                <section className="bg-card rounded-[20px] overflow-hidden shadow-sm border border-border">
                    <div className="grid grid-cols-12 gap-4 px-7 py-4 bg-hover-bg border-b border-border text-[11px] font-medium text-muted uppercase tracking-wider">
                        <div className="col-span-12 md:col-span-6">Campaign / Ad Set / Ad</div>
                        <div className="hidden md:block col-span-2 text-right">Spend</div>
                        <div className="hidden md:block col-span-2 text-right">Leads</div>
                        <div className="hidden md:block col-span-2 text-right">CPL</div>
                    </div>

                    {hierarchy.length === 0 && (
                        <div className="p-16 text-center">
                            <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-[14px] font-medium text-foreground">No Data Available</p>
                            <p className="text-[13px] text-muted mt-1">No active ad data found for this account</p>
                        </div>
                    )}

                    <div className="divide-y divide-border">
                        {hierarchy.map((campaign, cIdx) => (
                            <div key={`camp-${cIdx}`}>
                                <div className="grid grid-cols-12 gap-4 px-7 py-5 cursor-pointer hover:bg-hover-bg transition-colors border-b border-border"
                                    onClick={() => toggleItem(`camp-${cIdx}`)}>
                                    <div className="col-span-12 md:col-span-6 flex items-center gap-3">
                                        <svg className={`w-4 h-4 text-muted transition-transform flex-shrink-0 ${isCollapsed(`camp-${cIdx}`) ? '-rotate-90' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                        <div>
                                            <p className="font-semibold text-foreground text-[14px]">{campaign.name}</p>
                                            <p className="text-[11px] text-muted mt-0.5">Campaign</p>
                                        </div>
                                    </div>
                                    <div className="hidden md:block col-span-2 text-right text-[13px] font-semibold text-foreground self-center tabular-nums">${campaign.spend.toFixed(2)}</div>
                                    <div className="hidden md:block col-span-2 text-right text-[13px] font-semibold text-foreground self-center tabular-nums">{campaign.leads}</div>
                                    <div className="hidden md:block col-span-2 text-right self-center flex flex-col items-end gap-1.5">
                                        <span className={`text-[14px] font-bold tabular-nums ${(campaignThresholds.find(t => t.campaign_name === campaign.name)?.cpl_threshold || currentAccount?.cpl_threshold || 0) > 0 && campaign.avgCpl > (campaignThresholds.find(t => t.campaign_name === campaign.name)?.cpl_threshold || currentAccount?.cpl_threshold || 15) ? 'text-red-600' : 'text-green-600'}`}>
                                            ${campaign.avgCpl.toFixed(2)}
                                        </span>
                                        <CampaignThresholdEditor
                                            accountId={accountId}
                                            campaignName={campaign.name}
                                            initialThreshold={campaignThresholds.find(t => t.campaign_name === campaign.name)?.cpl_threshold || currentAccount?.cpl_threshold || 0}
                                            onUpdate={handleCampaignThresholdUpdate}
                                        />
                                    </div>
                                </div>

                                {!isCollapsed(`camp-${cIdx}`) && Object.values(campaign.adSets).map((adSet, sIdx) => (
                                    <div key={`set-${cIdx}-${sIdx}`} className="bg-hover-bg">
                                        <div className="grid grid-cols-12 gap-4 px-7 py-4 cursor-pointer hover:bg-hover-bg transition-colors border-b border-border"
                                            onClick={() => toggleItem(`set-${cIdx}-${sIdx}`)}>
                                            <div className="col-span-12 md:col-span-6 flex items-center gap-3 pl-10">
                                                <svg className={`w-3.5 h-3.5 text-muted transition-transform flex-shrink-0 ${isCollapsed(`set-${cIdx}-${sIdx}`) ? '-rotate-90' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                </svg>
                                                <p className="font-medium text-foreground text-[13px]">{adSet.name}</p>
                                            </div>
                                            <div className="hidden md:block col-span-2 text-right text-[13px] text-muted self-center tabular-nums">${adSet.spend.toFixed(2)}</div>
                                            <div className="hidden md:block col-span-2 text-right text-[13px] text-muted self-center tabular-nums">{adSet.leads}</div>
                                            <div className="hidden md:block col-span-2 text-right text-[13px] text-foreground self-center tabular-nums">${adSet.avgCpl.toFixed(2)}</div>
                                        </div>

                                        {!isCollapsed(`set-${cIdx}-${sIdx}`) && adSet.ads.map((ad) => (
                                            <div key={`ad-${ad.ad_meta_id}`}
                                                className={`grid grid-cols-12 gap-4 px-7 py-4 border-b border-border hover:bg-hover-bg transition-colors ${ad.status === "CRITICAL" ? "bg-red-50/20" : ""}`}>
                                                <div className="col-span-12 md:col-span-6 flex items-center gap-3 pl-20 overflow-hidden">
                                                    <div className={`w-1.5 h-6 rounded-full flex-shrink-0 ${ad.status === "CRITICAL" ? "bg-red-500" : ad.status === "ALERT" ? "bg-amber-400" : ad.status === "RISK" ? "bg-yellow-400" : "bg-border"}`} />
                                                    <div className="min-w-0">
                                                        <p className="text-[13px] text-foreground truncate" title={ad.ad_name}>{ad.ad_name}</p>
                                                        <p className="text-[11px] text-muted mt-0.5 font-mono">{ad.ad_meta_id}</p>
                                                    </div>
                                                </div>
                                                <div className="hidden md:block col-span-2 text-right text-[13px] text-muted self-center tabular-nums">${ad.spend.toFixed(2)}</div>
                                                <div className="hidden md:block col-span-2 text-right text-[13px] text-muted self-center tabular-nums">{ad.leads}</div>
                                                <div className="col-span-12 md:col-span-2 text-right flex flex-col items-end justify-center gap-1.5">
                                                    <span className={`text-[13px] font-bold tabular-nums ${ad.status === "CRITICAL" || ad.status === "ALERT" ? "text-red-600" : ad.status === "RISK" ? "text-amber-600" : "text-green-600"}`}>
                                                        ${ad.calculated_cpl.toFixed(2)}
                                                    </span>
                                                    <StatusBadge status={ad.status} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Account Alert History */}
                <section className="space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[17px] font-semibold text-foreground">Alert/Pause History</h2>
                        <Link href="/alerts" className="text-[13px] text-blue-600 hover:text-blue-700 font-medium transition-colors">
                            View all →
                        </Link>
                    </div>
                    <AccountAlertHistory accountId={accountId} />
                </section>
            </div>
        </div>
    );
}
