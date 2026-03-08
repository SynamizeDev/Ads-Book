"use client";

import { useState } from "react";
import Toast from "../../components/Toast";

export default function ImageGeneratorPage() {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setToast({ message: "Please enter a description for your image.", type: "error" });
            return;
        }
        setIsGenerating(true);
        try {
            // Placeholder: wire to your image generation API when ready
            await new Promise((r) => setTimeout(r, 800));
            setToast({ message: "Image generation will be available soon.", type: "success" });
        } catch {
            setToast({ message: "Something went wrong.", type: "error" });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-[900px] mx-auto px-10 pt-10">
                <div className="mb-10">
                    <h1 className="text-[26px] font-bold text-foreground tracking-tight mb-2">Image Generator</h1>
                    <p className="text-[14px] text-muted">Create images from text descriptions for your ads and creatives.</p>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-4">
                        <div className="bg-card rounded-[24px] border border-border p-6 shadow-sm">
                            <label className="block text-[13px] font-semibold text-muted uppercase tracking-wider mb-4">Describe your image</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g. A modern coffee shop interior with warm lighting and minimalist furniture..."
                                className="w-full h-40 bg-background border border-border rounded-[18px] p-5 text-[15px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none font-medium leading-relaxed placeholder:text-muted"
                                disabled={isGenerating}
                            />
                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !prompt.trim()}
                                    className="flex items-center gap-2.5 bg-accent text-accent-foreground px-8 py-3.5 rounded-[18px] font-bold text-[14px] hover:opacity-90 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGenerating ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Generate Image
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="bg-card rounded-[24px] border border-border p-6 shadow-sm min-h-[280px] flex items-center justify-center">
                            <div className="text-center text-muted">
                                <svg className="w-14 h-14 mx-auto mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-[14px]">Your generated image will appear here.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
