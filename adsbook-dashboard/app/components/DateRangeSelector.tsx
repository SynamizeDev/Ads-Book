"use client";

import { useRouter, useSearchParams } from "next/navigation";

const RANGES = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "Last 7 Days", value: "last_7d" },
    { label: "Last 14 Days", value: "last_14d" },
    { label: "Last 30 Days", value: "last_30d" },
    { label: "Maximum", value: "maximum" },
];

export default function DateRangeSelector() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentRange = searchParams.get("range") || "last_30d";

    const handleRangeChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("range", value);
        router.push(`/?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted font-medium hidden sm:block">Performance Window:</span>
            <div className="relative group">
                <select
                    value={currentRange}
                    onChange={(e) => handleRangeChange(e.target.value)}
                    className="appearance-none bg-card border border-border rounded-full pl-5 pr-10 py-2 text-[13px] font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer hover:border-accent transition-all shadow-sm"
                >
                    {RANGES.map((r) => (
                        <option key={r.value} value={r.value}>
                            {r.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted group-hover:text-accent transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
