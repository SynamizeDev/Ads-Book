"use client";

import { BudgetInfo } from "@/lib/api";

export default function BudgetProgress({ budget }: { budget: BudgetInfo }) {
    if (!budget.spend_cap || budget.spend_cap <= 0) return null;

    const percentage = Math.min(Math.round((budget.amount_spent / budget.spend_cap) * 100), 100);
    const remaining = budget.spend_cap - budget.amount_spent;

    // Color based on percentage
    const getBarColor = () => {
        if (percentage > 90) return "bg-red-500";
        if (percentage > 75) return "bg-amber-500";
        return "bg-blue-500";
    };

    return (
        <div className="bg-card rounded-[20px] p-6 shadow-sm hover:shadow-md transition-all border border-border">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-[13px] text-muted font-medium">Monthly Budget</p>
                    <p className="text-[11px] text-muted mt-0.5">Spend Cap vs. Actual</p>
                </div>
                <div className="text-right">
                    <span className={`text-[13px] font-bold ${percentage > 90 ? 'text-red-500' : 'text-foreground'}`}>
                        {percentage}%
                    </span>
                </div>
            </div>

            <div className="space-y-3">
                {/* Progress Bar */}
                <div className="w-full h-2.5 bg-hover-bg rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ease-out ${getBarColor()}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>

                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-2xl font-bold text-foreground tabular-nums">
                            ${budget.amount_spent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-[11px] text-muted">Spent so far</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[13px] font-semibold text-muted tabular-nums">
                            ${budget.spend_cap.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-muted">Limit</p>
                    </div>
                </div>

                {remaining > 0 && (
                    <p className="text-[11px] text-muted pt-1 border-t border-border/50">
                        ${remaining.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} remaining this month
                    </p>
                )}
            </div>
        </div>
    );
}
