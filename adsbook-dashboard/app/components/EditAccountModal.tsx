"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Account, updateAccount } from "@/lib/api";

interface EditAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (updatedAccount: Account) => void;
    account: Account | null;
}

export default function EditAccountModal({ isOpen, onClose, onSuccess, account }: EditAccountModalProps) {
    const [name, setName] = useState("");
    const [cplThreshold, setCplThreshold] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (account) {
            setName(account.account_name);
            setCplThreshold(account.cpl_threshold.toString());
        }
    }, [account]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!account) return;

        setError(null);
        setLoading(true);

        try {
            const result = await updateAccount(account.account_id, {
                name,
                cpl_threshold: parseFloat(cplThreshold),
            });

            if (!result.success) {
                throw new Error(result.error || "Failed to update account");
            }

            // Success
            onSuccess(result.data!.updatedAccount);
            onClose();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen || !mounted || !account) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden scale-100 transition-all z-10">
                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-lg">Edit Account</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        ✕
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-100 flex items-center gap-2">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Account Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all placeholder:text-slate-400 font-medium text-slate-900"
                            placeholder="e.g. Resultz Only Fitness"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Ad Account ID</label>
                        <input
                            type="text"
                            disabled
                            className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg focus:outline-none cursor-not-allowed font-medium"
                            value={account.account_id}
                        />
                        <p className="text-[10px] text-slate-400 font-medium">Cannot be changed.</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Target CPL ($)</label>
                        <input
                            type="number"
                            required
                            min="0.01"
                            step="0.01"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all placeholder:text-slate-400 font-medium text-slate-900"
                            placeholder="40.00"
                            value={cplThreshold}
                            onChange={e => setCplThreshold(e.target.value)}
                        />
                    </div>

                    <div className="pt-4 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>,
        document.body
    );
}
