"use client";

import { useState, useEffect } from "react";
import { getAccounts, getComparison, Account, CompareAccount } from "@/lib/api";

const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899"];

export default function ComparePage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [comparison, setComparison] = useState<CompareAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [comparing, setComparing] = useState(false);
    const [days, setDays] = useState(7);

    useEffect(() => {
        async function load() {
            const res = await getAccounts();
            if (res.success && res.data) setAccounts(res.data);
            setLoading(false);
        }
        load();
    }, []);

    const toggleAccount = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleCompare = async () => {
        if (selectedIds.length < 2) return;
        setComparing(true);
        try {
            const res = await getComparison(selectedIds, days);
            if (res.success && res.data) setComparison(res.data);
        } catch (e) { console.error(e); }
        finally { setComparing(false); }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>
    );

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-[1400px] mx-auto px-10 pt-10">
                <h1 className="text-[22px] font-bold text-foreground tracking-tight mb-1">Account Comparison</h1>
                <p className="text-[14px] text-muted mb-10">Select accounts to compare their performance side by side.</p>

                {/* Account Selection */}
                <div className="bg-card rounded-[20px] p-7 shadow-sm border border-border mb-8">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-[15px] font-semibold text-foreground">Select Accounts</h2>
                        <div className="flex items-center gap-3">
                            <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}
                                className="bg-background border border-border rounded-[10px] px-3 py-2 text-[13px] text-foreground focus:outline-none">
                                <option value={7}>Last 7 days</option>
                                <option value={14}>Last 14 days</option>
                                <option value={30}>Last 30 days</option>
                            </select>
                            <button onClick={handleCompare} disabled={selectedIds.length < 2 || comparing}
                                className="bg-foreground text-background text-[13px] font-medium px-5 py-2 rounded-[10px] hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-2">
                                {comparing && <span className="w-3 h-3 border-2 border-background/30 border-t-background rounded-full animate-spin" />}
                                Compare ({selectedIds.length})
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {accounts.map((acc) => {
                            const isSelected = selectedIds.includes(acc.account_id);
                            return (
                                <button key={acc.id} onClick={() => toggleAccount(acc.account_id)}
                                    className={`px-4 py-2.5 rounded-[12px] text-[13px] font-medium transition-all border ${isSelected
                                        ? "bg-accent text-white border-accent shadow-sm"
                                        : "bg-background text-muted border-border hover:border-foreground hover:text-foreground"
                                        }`}>
                                    {acc.account_name}
                                </button>
                            );
                        })}
                    </div>
                    {selectedIds.length > 0 && selectedIds.length < 2 && (
                        <p className="text-[12px] text-muted mt-3">Select at least 2 accounts to compare</p>
                    )}
                </div>

                {/* Comparison Results */}
                {comparison.length > 0 && (
                    <div className="space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {comparison.map((acc, i) => (
                                <div key={acc.account_id} className="bg-card rounded-[20px] p-6 shadow-sm border border-border hover:shadow-md transition-all">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <h3 className="text-[14px] font-semibold text-foreground">{acc.account_name}</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[11px] text-muted mb-0.5">Spend</p>
                                            <p className="text-[18px] font-bold text-foreground tabular-nums">${acc.total_spend.toFixed(0)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted mb-0.5">Leads</p>
                                            <p className="text-[18px] font-bold text-foreground tabular-nums">{acc.total_leads}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted mb-0.5">Avg CPL</p>
                                            <p className={`text-[18px] font-bold tabular-nums ${acc.avg_cpl > acc.cpl_threshold ? "text-danger" : "text-success"}`}>
                                                ${acc.avg_cpl.toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted mb-0.5">Alerts</p>
                                            <p className={`text-[18px] font-bold tabular-nums ${acc.alert_count > 0 ? "text-danger" : "text-foreground"}`}>{acc.alert_count}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Comparison Table */}
                        <div className="bg-card rounded-[20px] overflow-hidden shadow-sm border border-border">
                            <div className="px-7 py-4 bg-hover-bg border-b border-border">
                                <h2 className="text-[15px] font-semibold text-foreground">Detailed Comparison</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="px-6 py-3.5 text-[11px] font-medium text-muted uppercase tracking-wider">Metric</th>
                                            {comparison.map((acc, i) => (
                                                <th key={acc.account_id} className="px-6 py-3.5 text-[11px] font-medium uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                        <span className="text-muted">{acc.account_name}</span>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {[
                                            { label: "Total Spend", key: "total_spend", format: (v: number) => `$${v.toFixed(2)}` },
                                            { label: "Total Leads", key: "total_leads", format: (v: number) => v.toString() },
                                            { label: "Average CPL", key: "avg_cpl", format: (v: number) => `$${v.toFixed(2)}` },
                                            { label: "CPL Threshold", key: "cpl_threshold", format: (v: number) => `$${v.toFixed(2)}` },
                                            { label: "Alerts", key: "alert_count", format: (v: number) => v.toString() },
                                        ].map((row) => (
                                            <tr key={row.key} className="hover:bg-hover-bg transition-colors">
                                                <td className="px-6 py-4 text-[13px] font-medium text-foreground">{row.label}</td>
                                                {comparison.map((acc) => {
                                                    const val = (acc as unknown as Record<string, number>)[row.key];
                                                    const isBest = row.key === "avg_cpl"
                                                        ? val === Math.min(...comparison.map(c => (c as unknown as Record<string, number>)[row.key]))
                                                        : row.key === "total_leads"
                                                            ? val === Math.max(...comparison.map(c => (c as unknown as Record<string, number>)[row.key]))
                                                            : false;
                                                    return (
                                                        <td key={acc.account_id} className={`px-6 py-4 text-[13px] tabular-nums ${isBest ? "text-success font-bold" : "text-foreground"}`}>
                                                            {row.format(val)}
                                                            {isBest && <span className="ml-1 text-[10px]">★</span>}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
