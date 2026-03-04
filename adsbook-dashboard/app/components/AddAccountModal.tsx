"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createAccount, Account } from "@/lib/api";

interface AddAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newAccount: Account) => void;
}

export default function AddAccountModal({ isOpen, onClose, onSuccess }: AddAccountModalProps) {
    const [name, setName] = useState("");
    const [adAccountId, setAdAccountId] = useState("");
    const [cplThreshold, setCplThreshold] = useState("40");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await createAccount({
                name,
                ad_account_id: adAccountId,
                cpl_threshold: parseFloat(cplThreshold),
            });

            if (!result.success) {
                throw new Error(result.error || "Failed to create account");
            }

            // Success
            onSuccess(result.data!.account);
            onClose();
            // Reset form
            setName("");
            setAdAccountId("");
            setCplThreshold("40");

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-[#1a1f2e] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden z-10 border border-white/10">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="font-bold text-white text-lg">Add New Account</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-lg leading-none">
                        ✕
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {error && (
                        <div className="bg-red-500/10 text-red-400 text-sm px-3 py-2 rounded-lg border border-red-500/30 flex items-center gap-2">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Account Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all placeholder:text-slate-600 font-medium text-white"
                            placeholder="e.g. Resultz Only Fitness"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ad Account ID</label>
                        <input
                            type="text"
                            required
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all placeholder:text-slate-600 font-medium text-white"
                            placeholder="e.g. 1431395567675793"
                            value={adAccountId}
                            onChange={e => setAdAccountId(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-500 font-medium">Meta Ad Account ID (digits only)</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Target CPL ($)</label>
                        <input
                            type="number"
                            required
                            min="0.01"
                            step="0.01"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all placeholder:text-slate-600 font-medium text-white"
                            placeholder="40.00"
                            value={cplThreshold}
                            onChange={e => setCplThreshold(e.target.value)}
                        />
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-slate-400 font-bold hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-white/10"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Adding...
                                </>
                            ) : (
                                "Add Account"
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>,
        document.body
    );
}
