"use client";

import { useState, useEffect } from "react";
import { getSettings, updateSettings, Settings } from "@/lib/api";
import Toast from "../components/Toast";
import { useTheme } from "../components/ThemeProvider";

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [form, setForm] = useState({ name: "", telegram_chat_id: "", default_cpl_threshold: 40, weekly_report_enabled: false });
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        async function load() {
            const res = await getSettings();
            if (res.success && res.data) {
                setSettings(res.data);
                setForm({
                    name: res.data.name || "",
                    telegram_chat_id: res.data.telegram_chat_id || "",
                    default_cpl_threshold: res.data.default_cpl_threshold || 40,
                    weekly_report_enabled: res.data.weekly_report_enabled || false,
                });
            }
            setLoading(false);
        }
        load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await updateSettings(form);
            if (res.success) {
                setToast({ message: "Settings saved successfully", type: "success" });
            } else {
                setToast({ message: res.error || "Failed to save", type: "error" });
            }
        } catch { setToast({ message: "Network error", type: "error" }); }
        finally { setSaving(false); }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>
    );

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-[800px] mx-auto px-10 pt-10">
                <h1 className="text-[22px] font-bold text-foreground tracking-tight mb-1">Settings</h1>
                <p className="text-[14px] text-muted mb-10">Manage your agency configuration and notification preferences.</p>

                <div className="space-y-8">
                    {/* General */}
                    <section className="bg-card rounded-[20px] p-7 shadow-sm border border-border">
                        <h2 className="text-[16px] font-semibold text-foreground mb-5">General</h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[13px] font-medium text-muted mb-2">Agency Name</label>
                                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-background border border-border rounded-[12px] px-4 py-3 text-[14px] text-foreground focus:border-accent focus:outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="block text-[13px] font-medium text-muted mb-2">Default CPL Threshold</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted">$</span>
                                    <input type="number" value={form.default_cpl_threshold} onChange={(e) => setForm({ ...form, default_cpl_threshold: parseFloat(e.target.value) || 0 })}
                                        className="w-32 bg-background border border-border rounded-[12px] px-4 py-3 text-[14px] text-foreground tabular-nums focus:border-accent focus:outline-none transition-colors" />
                                </div>
                                <p className="text-[12px] text-muted mt-1">Applied to new accounts by default</p>
                            </div>
                        </div>
                    </section>

                    {/* Appearance */}
                    <section className="bg-card rounded-[20px] p-7 shadow-sm border border-border">
                        <h2 className="text-[16px] font-semibold text-foreground mb-5">Appearance</h2>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[14px] font-medium text-foreground">Dark mode</p>
                                <p className="text-[12px] text-muted mt-0.5">Toggle between light and dark themes</p>
                            </div>
                            <button onClick={toggleTheme}
                                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${theme === 'dark' ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </section>

                    {/* Notifications */}
                    <section className="bg-card rounded-[20px] p-7 shadow-sm border border-border">
                        <h2 className="text-[16px] font-semibold text-foreground mb-5">Notifications</h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[13px] font-medium text-muted mb-2">Telegram Chat ID</label>
                                <input type="text" value={form.telegram_chat_id} onChange={(e) => setForm({ ...form, telegram_chat_id: e.target.value })}
                                    className="w-full bg-background border border-border rounded-[12px] px-4 py-3 text-[14px] text-foreground font-mono focus:border-accent focus:outline-none transition-colors"
                                    placeholder="e.g. -1001234567890" />
                                <p className="text-[12px] text-muted mt-1">Alerts and reports will be sent to this chat</p>
                            </div>
                        </div>
                    </section>

                    {/* Reports */}
                    <section className="bg-card rounded-[20px] p-7 shadow-sm border border-border">
                        <h2 className="text-[16px] font-semibold text-foreground mb-5">Weekly Reports</h2>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[14px] font-medium text-foreground">Automated Weekly Report</p>
                                <p className="text-[12px] text-muted mt-0.5">Sends a summary to Telegram every Sunday at 9 AM UTC</p>
                            </div>
                            <button onClick={() => setForm({ ...form, weekly_report_enabled: !form.weekly_report_enabled })}
                                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${form.weekly_report_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${form.weekly_report_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        {form.weekly_report_enabled && (
                            <div className="mt-4 p-4 bg-background rounded-[14px] border border-border text-[13px] text-muted">
                                <p className="font-medium text-foreground mb-1">Report includes:</p>
                                <ul className="space-y-1 ml-4 list-disc">
                                    <li>Total spend per account</li>
                                    <li>Total leads & average CPL</li>
                                    <li>Alert count for the week</li>
                                    <li>Date range (Mon–Sun)</li>
                                </ul>
                            </div>
                        )}
                    </section>

                    {/* Save */}
                    <div className="flex justify-end">
                        <button onClick={handleSave} disabled={saving}
                            className="bg-foreground text-background text-[14px] font-medium px-8 py-3 rounded-[12px] hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
                            {saving ? <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> : null}
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
