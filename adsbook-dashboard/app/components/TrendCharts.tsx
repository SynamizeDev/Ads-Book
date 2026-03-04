import { TrendPoint, TrendResponse, AdSeries } from "@/lib/api";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from "recharts";

interface TrendChartsProps {
    data: TrendResponse;
}

// Color palette for ad lines
const AD_COLORS = [
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#f97316", // Orange
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // Find aggregate entry
        const aggEntry = payload.find((p: any) => p.dataKey === "avg_cpl" || p.dataKey === "total_spend");
        // Individual series entries
        const seriesEntries = payload.filter((p: any) => p.dataKey.startsWith("ad_"));

        return (
            <div className="bg-card/95 border border-border p-4 rounded-2xl shadow-2xl backdrop-blur-xl min-w-[200px]">
                <p className="text-[12px] font-bold text-foreground mb-3">{label}</p>

                {aggEntry && (
                    <div className="flex items-center justify-between gap-4 mb-3 pb-2 border-b border-border">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: aggEntry.color }} />
                            <p className="text-[13px] font-bold text-foreground">Total {aggEntry.name}</p>
                        </div>
                        <p className="text-[14px] font-black text-foreground tabular-nums">
                            ${aggEntry.value.toFixed(2)}
                        </p>
                    </div>
                )}

                <div className="space-y-2">
                    {seriesEntries.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                <p className="text-[11px] font-medium text-muted truncate max-w-[150px]">
                                    {entry.name}
                                </p>
                            </div>
                            <p className="text-[12px] font-bold text-foreground tabular-nums">
                                ${entry.value.toFixed(2)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export default function TrendCharts({ data }: TrendChartsProps) {
    if (!data || !data.aggregate || data.aggregate.length === 0) {
        return (
            <div className="bg-card rounded-[20px] p-8 border border-border flex flex-col items-center justify-center min-h-[300px]">
                <p className="text-muted text-[13px]">No trend data available for the selected period</p>
            </div>
        );
    }

    // Merge aggregate and series data into a single array for Recharts
    // Recharts handles missing points by interpolating or leaving gaps
    const dates = Array.from(new Set([
        ...data.aggregate.map(p => p.date),
        ...data.series.flatMap(s => s.points.map(p => p.date))
    ])).sort();

    const chartData = dates.map(date => {
        const agg = data.aggregate.find(p => p.date === date);
        const point: any = {
            date,
            displayDate: new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
            avg_cpl: agg?.avg_cpl || 0,
            total_spend: agg?.total_spend || 0,
        };

        // Add per-ad points
        data.series.forEach(s => {
            const p = s.points.find(pt => pt.date === date);
            point[`ad_cpl_${s.id}`] = p?.cpl || 0;
            point[`ad_spend_${s.id}`] = p?.spend || 0;
        });

        return point;
    });

    return (
        <div className="grid grid-cols-1 gap-8">
            {/* CPL Trend */}
            <div className="bg-card rounded-[30px] p-8 shadow-sm border border-border relative overflow-hidden group">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h3 className="text-lg font-bold text-foreground mb-1">CPL Performance History</h3>
                        <p className="text-xs text-muted">Averaged across all active ads per day</p>
                    </div>
                </div>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorCpl" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                            <XAxis
                                dataKey="displayDate"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: 'var(--muted)' }}
                                dy={15}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: 'var(--muted)' }}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip content={<CustomTooltip />} />

                            {/* Ad Series Lines (Subtle) */}
                            {data.series.map((s, i) => (
                                <Area
                                    key={`ad_cpl_${s.id}`}
                                    type="monotone"
                                    dataKey={`ad_cpl_${s.id}`}
                                    name={s.name}
                                    stroke={AD_COLORS[i % AD_COLORS.length]}
                                    strokeWidth={1.5}
                                    strokeOpacity={0.4}
                                    fill="transparent"
                                    dot={false}
                                />
                            ))}

                            {/* Aggregate Line (Bold) */}
                            <Area
                                type="monotone"
                                dataKey="avg_cpl"
                                name="CPL"
                                stroke="#3b82f6"
                                strokeWidth={3.5}
                                fillOpacity={1}
                                fill="url(#colorCpl)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Spend Trend */}
            <div className="bg-card rounded-[30px] p-8 shadow-sm border border-border">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h3 className="text-lg font-bold text-foreground mb-1">Budget Allocation History</h3>
                        <p className="text-xs text-muted">Daily spend distribution across individual ads</p>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                            <XAxis
                                dataKey="displayDate"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: 'var(--muted)' }}
                                dy={15}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: 'var(--muted)' }}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip content={<CustomTooltip />} />

                            {/* Ad Series Lines (Subtle) */}
                            {data.series.map((s, i) => (
                                <Area
                                    key={`ad_spend_${s.id}`}
                                    type="monotone"
                                    dataKey={`ad_spend_${s.id}`}
                                    name={s.name}
                                    stroke={AD_COLORS[i % AD_COLORS.length]}
                                    strokeWidth={1.2}
                                    strokeOpacity={0.3}
                                    fill="transparent"
                                    strokeDasharray="4 4"
                                />
                            ))}

                            {/* Aggregate Line (Bold) */}
                            <Area
                                type="monotone"
                                dataKey="total_spend"
                                name="Spend"
                                stroke="#10b981"
                                strokeWidth={3.5}
                                fillOpacity={1}
                                fill="url(#colorSpend)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
