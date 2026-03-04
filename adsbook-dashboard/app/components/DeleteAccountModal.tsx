"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Account, deleteAccount } from "@/lib/api";

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (deletedAccountId: string) => void;
    account: Account | null;
}

export default function DeleteAccountModal({ isOpen, onClose, onSuccess, account }: DeleteAccountModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    async function handleDelete() {
        if (!account) return;
        setError(null);
        setLoading(true);

        try {
            const result = await deleteAccount(account.account_id);

            if (!result.success) {
                throw new Error(result.error || "Failed to delete account");
            }

            // Success
            onSuccess(account.account_id);
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
            <div className="relative bg-card w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden scale-100 transition-all z-10">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        🗑️
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg mb-2">Delete Account?</h3>
                    <p className="text-slate-500 text-sm mb-6">
                        Are you sure you want to delete <strong>{account.account_name}</strong>? This action will remove it from your dashboard.
                    </p>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-100 flex items-center gap-2 mb-4 text-left">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
                        >
                            {loading ? "Deleting..." : "Delete"}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
