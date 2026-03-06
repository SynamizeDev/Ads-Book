"use client";

import { useState } from "react";
import { triggerAlertEngine, triggerWeeklyReport } from "@/lib/api";
import Toast from "./Toast";

export default function QuickActionsPanel() {
    const [alertLoading, setAlertLoading] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const handleAlertEngine = async () => {
        setAlertLoading(true);
        try {
            const res = await triggerAlertEngine();
            if (res.success) {
                setToast({ message: "Alert engine triggered successfully", type: "success" });
            } else {
                setToast({ message: res.error || "Failed to trigger alert engine", type: "error" });
            }
        } catch {
            setToast({ message: "Network error", type: "error" });
        } finally {
            setAlertLoading(false);
        }
    };

    const handleWeeklyReport = async () => {
        setReportLoading(true);
        try {
            const res = await triggerWeeklyReport();
            if (res.success) {
                setToast({ message: "Weekly report sent to Telegram", type: "success" });
            } else {
                setToast({ message: res.error || "Failed to send weekly report", type: "error" });
            }
        } catch {
            setToast({ message: "Network error", type: "error" });
        } finally {
            setReportLoading(false);
        }
    };

    return (
        <>
            <div className="flex items-center gap-3">
                {/* Run Alert Engine */}
                <button
                    onClick={handleAlertEngine}
                    disabled={alertLoading || reportLoading}
                    className="flex items-center gap-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 hover:border-accent/40 px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {alertLoading ? (
                        <span className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                    ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    )}
                    {alertLoading ? "Running..." : "Run Alert Engine"}
                </button>

                {/* Send Weekly Report */}
                <button
                    onClick={handleWeeklyReport}
                    disabled={alertLoading || reportLoading}
                    className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/20 hover:border-green-500/40 px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {reportLoading ? (
                        <span className="w-3.5 h-3.5 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                    ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    )}
                    {reportLoading ? "Sending..." : "Weekly Report"}
                </button>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
