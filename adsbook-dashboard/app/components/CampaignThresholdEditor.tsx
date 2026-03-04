"use client";

import { useState } from "react";
import { setCampaignThreshold } from "@/lib/api";

interface CampaignThresholdEditorProps {
    accountId: string;
    campaignName: string;
    initialThreshold: number;
    onUpdate: (newName: string, newVal: number) => void;
}

export default function CampaignThresholdEditor({ accountId, campaignName, initialThreshold, onUpdate }: CampaignThresholdEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialThreshold.toString());
    const [loading, setLoading] = useState(false);

    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const numVal = parseFloat(value);
        if (isNaN(numVal) || numVal <= 0) return;

        setLoading(true);
        try {
            const res = await setCampaignThreshold(accountId, campaignName, numVal);
            if (res.success) {
                onUpdate(campaignName, numVal);
                setIsEditing(false);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-[11px]">$</span>
                    <input
                        type="number"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        className="w-16 h-8 pl-5 pr-2 bg-background border border-border rounded-lg text-[13px] font-bold focus:ring-1 focus:ring-blue-500 outline-none tabular-nums"
                        autoFocus
                    />
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="p-1.5 bg-foreground text-background rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                    {loading ? (
                        <div className="w-3 h-3 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </button>
                <button
                    onClick={() => setIsEditing(false)}
                    className="p-1.5 bg-hover-bg text-muted rounded-lg hover:text-foreground transition-colors"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 group">
                <p className="text-[13px] font-semibold text-foreground tabular-nums">${initialThreshold}</p>
                <button
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-blue-500 transition-all"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
            </div>
            <p className="text-[10px] text-muted uppercase tracking-tighter">Threshold</p>
        </div>
    );
}
