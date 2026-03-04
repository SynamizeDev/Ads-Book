export default function Loading() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                {/* Animated Icon */}
                <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />

                {/* Text */}
                <div className="text-center">
                    <h3 className="text-slate-900 font-semibold text-lg">Loading Account...</h3>
                    <p className="text-slate-500 text-sm">Fetching latest performance data</p>
                </div>
            </div>
        </div>
    );
}
