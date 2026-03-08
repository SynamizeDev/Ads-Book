export default function Loading() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                {/* Animated Icon */}
                <div className="w-8 h-8 border-2 border-border border-t-foreground/60 rounded-full animate-spin" />

                {/* Text */}
                <div className="text-center">
                    <h3 className="text-foreground font-semibold text-lg">Loading Account...</h3>
                    <p className="text-muted text-sm">Fetching latest performance data</p>
                </div>
            </div>
        </div>
    );
}
