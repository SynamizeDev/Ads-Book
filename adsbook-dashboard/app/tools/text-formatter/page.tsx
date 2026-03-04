"use client";

import { useState, useRef } from "react";
import Toast from "../../components/Toast";
import { enhanceText } from "@/lib/api";

const BOLD_UPPER = 0x1D400;
const BOLD_LOWER = 0x1D41A;
const BOLD_NUM = 0x1D7CE;

const ITALIC_UPPER = 0x1D434;
const ITALIC_LOWER = 0x1D44E;
const ITALIC_SMALL_H = 0x210E;

const BOLD_ITALIC_UPPER = 0x1D468;
const BOLD_ITALIC_LOWER = 0x1D482;

const SCRIPT_UPPER_BASE = 0x1D49C;
const SCRIPT_LOWER_BASE = 0x1D4B6;

const SCRIPT_UPPER_EXCEPTIONS: Record<string, number> = {
    'B': 0x212C, 'E': 0x2130, 'F': 0x2131, 'H': 0x210B, 'I': 0x2110, 'L': 0x2112, 'M': 0x2133, 'R': 0x211B
};
const SCRIPT_LOWER_EXCEPTIONS: Record<string, number> = {
    'e': 0x212F, 'g': 0x210A, 'o': 0x2134
};

// Map to convert Unicode stylized characters back to ASCII
const REVERSE_MAP: Record<string, string> = {};

const buildMaps = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const styles = ['bold', 'italic', 'boldItalic', 'script'];

    // This is a helper to build the normalization map
    const addToReverse = (char: string, original: string) => {
        REVERSE_MAP[char] = original;
    };

    for (let i = 0; i < 26; i++) {
        const u = String.fromCharCode(65 + i);
        const l = String.fromCharCode(97 + i);

        // Bold
        addToReverse(String.fromCodePoint(BOLD_UPPER + i), u);
        addToReverse(String.fromCodePoint(BOLD_LOWER + i), l);

        // Italic
        addToReverse(String.fromCodePoint(ITALIC_UPPER + i), u);
        if (l === 'h') addToReverse(String.fromCodePoint(ITALIC_SMALL_H), l);
        else addToReverse(String.fromCodePoint(ITALIC_LOWER + i), l);

        // Bold Italic
        addToReverse(String.fromCodePoint(BOLD_ITALIC_UPPER + i), u);
        addToReverse(String.fromCodePoint(BOLD_ITALIC_LOWER + i), l);

        // Script
        if (SCRIPT_UPPER_EXCEPTIONS[u]) addToReverse(String.fromCodePoint(SCRIPT_UPPER_EXCEPTIONS[u]), u);
        else addToReverse(String.fromCodePoint(SCRIPT_UPPER_BASE + i), u);

        if (SCRIPT_LOWER_EXCEPTIONS[l]) addToReverse(String.fromCodePoint(SCRIPT_LOWER_EXCEPTIONS[l]), l);
        else addToReverse(String.fromCodePoint(SCRIPT_LOWER_BASE + i), l);
    }

    for (let i = 0; i < 10; i++) {
        addToReverse(String.fromCodePoint(BOLD_NUM + i), String.fromCharCode(48 + i));
    }
};

buildMaps();

const normalizeText = (text: string) => {
    return Array.from(text).map(char => REVERSE_MAP[char] || char).join('');
};

const transformText = (text: string, type: 'normal' | 'bold' | 'italic' | 'boldItalic' | 'script' | 'caps' | 'lower' | 'title') => {
    const clean = normalizeText(text);

    if (type === 'normal') return clean;
    if (type === 'caps') return clean.toUpperCase();
    if (type === 'lower') return clean.toLowerCase();
    if (type === 'title') return clean.replace(/\b\w/g, c => c.toUpperCase());

    return Array.from(clean).map(char => {
        const code = char.charCodeAt(0);
        const isUpper = code >= 65 && code <= 90;
        const isLower = code >= 97 && code <= 122;
        const isNum = code >= 48 && code <= 57;
        const index = isUpper ? code - 65 : isLower ? code - 97 : code - 48;

        if (type === 'bold') {
            if (isUpper) return String.fromCodePoint(BOLD_UPPER + index);
            if (isLower) return String.fromCodePoint(BOLD_LOWER + index);
            if (isNum) return String.fromCodePoint(BOLD_NUM + index);
        }

        if (type === 'italic') {
            if (isUpper) return String.fromCodePoint(ITALIC_UPPER + index);
            if (isLower) {
                if (char === 'h') return String.fromCodePoint(ITALIC_SMALL_H);
                return String.fromCodePoint(ITALIC_LOWER + index);
            }
        }

        if (type === 'boldItalic') {
            if (isUpper) return String.fromCodePoint(BOLD_ITALIC_UPPER + index);
            if (isLower) return String.fromCodePoint(BOLD_ITALIC_LOWER + index);
        }

        if (type === 'script') {
            if (isUpper) {
                const exception = SCRIPT_UPPER_EXCEPTIONS[char];
                return exception ? String.fromCodePoint(exception) : String.fromCodePoint(SCRIPT_UPPER_BASE + index);
            }
            if (isLower) {
                const exception = SCRIPT_LOWER_EXCEPTIONS[char];
                return exception ? String.fromCodePoint(exception) : String.fromCodePoint(SCRIPT_LOWER_BASE + index);
            }
        }

        return char;
    }).join('');
};

const QUICK_EMOJIS = ["🔥", "🚀", "💎", "✅", "📍", "👉", "✨", "📈", "💰", "⚡", "🎁", "⭐"];

export default function TextFormatterPage() {
    const [input, setInput] = useState("");
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleCopy = () => {
        if (!input) return;
        navigator.clipboard.writeText(input);
        setToast({ message: "Copied to clipboard!", type: "success" });
    };

    const handleEnhance = async (mode: "full" | "basic" = "full") => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = start !== end ? input.substring(start, end) : input;

        if (!selectedText.trim()) {
            setToast({ message: "Please enter some text to enhance.", type: "error" });
            return;
        }

        setIsEnhancing(true);
        try {
            const response = await enhanceText(selectedText, mode);
            if (response.success && response.data) {
                const enhanced = response.data.enhancedText;
                if (start !== end) {
                    const newValue = input.substring(0, start) + enhanced + input.substring(end);
                    setInput(newValue);
                } else {
                    setInput(enhanced);
                }
                setToast({ message: mode === "basic" ? "Essential parts bolded!" : "Text enhanced with AI!", type: "success" });
            } else {
                setToast({ message: response.error || "Failed to enhance text.", type: "error" });
            }
        } catch (error) {
            setToast({ message: "An unexpected error occurred.", type: "error" });
        } finally {
            setIsEnhancing(false);
        }
    };

    const applyFormat = (type: any) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        if (start !== end) {
            // Transform only selection
            const selectedText = input.substring(start, end);
            const transformedPart = transformText(selectedText, type);
            const newValue = input.substring(0, start) + transformedPart + input.substring(end);
            setInput(newValue);

            // Restore selection
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(start, start + transformedPart.length);
                }
            }, 0);
        } else {
            // Transform everything
            const formatted = transformText(input, type);
            setInput(formatted);
        }
    };

    const addEmoji = (emoji: string) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            setInput(prev => prev + emoji);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = input.substring(0, start) + emoji + input.substring(end);
        setInput(newValue);

        // Restore cursor
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(start + emoji.length, start + emoji.length);
            }
        }, 0);
    };

    const handleRemoveDashes = () => {
        const newValue = input.replace(/[\u2014\u2013]/g, "");
        setInput(newValue);
        setToast({ message: "Em-dashes removed!", type: "success" });
    };

    const handleFixDashes = () => {
        const newValue = input.replace(/[\u2014\u2013]/g, "-");
        setInput(newValue);
        setToast({ message: "Em-dashes replaced with hyphens!", type: "success" });
    };

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-[900px] mx-auto px-10 pt-10">
                <div className="mb-10">
                    <h1 className="text-[26px] font-bold text-foreground tracking-tight mb-2">Text Formatter</h1>
                    <p className="text-[14px] text-muted">Format your ad copy with bold, italic, and special characters for higher engagement.</p>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {/* Input Section */}
                    <div className="space-y-4">
                        <div className="bg-card rounded-[24px] border border-border p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-[13px] font-semibold text-muted uppercase tracking-wider">Editor</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEnhance("basic")}
                                        disabled={isEnhancing}
                                        className={`flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border transition-all ${isEnhancing
                                            ? "bg-accent/5 border-accent/20 text-accent opacity-50 cursor-not-allowed"
                                            : "bg-background border-border text-foreground hover:border-accent hover:text-accent"
                                            }`}
                                    >
                                        {isEnhancing ? "..." : "🪄 Basic Bold"}
                                    </button>
                                    <button
                                        onClick={() => handleEnhance("full")}
                                        disabled={isEnhancing}
                                        className={`flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border transition-all ${isEnhancing
                                            ? "bg-accent/10 border-accent/20 text-accent opacity-50 cursor-not-allowed"
                                            : "bg-accent/10 border-accent/20 text-accent hover:bg-accent/20 font-semibold shadow-sm"
                                            }`}
                                    >
                                        {isEnhancing ? (
                                            <>
                                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Processing...
                                            </>
                                        ) : (
                                            <>✨ Full Enhance</>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setInput("")}
                                        disabled={isEnhancing}
                                        className="text-[12px] text-muted hover:text-danger px-3 py-1 rounded-lg hover:bg-danger/5 transition-colors disabled:opacity-30"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type or paste your ad copy here..."
                                className="w-full h-64 bg-background border border-border rounded-[18px] p-5 text-[15px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none font-medium leading-relaxed"
                            />
                        </div>

                        {/* Toolbar */}
                        <div className="bg-card/50 backdrop-blur-xl rounded-[24px] border border-border p-6 shadow-sm flex flex-wrap gap-3">
                            <div className="w-full mb-2">
                                <span className="text-[11px] font-bold text-muted uppercase tracking-widest">Transformations</span>
                            </div>
                            <button onClick={() => applyFormat('normal')} disabled={isEnhancing} className="px-4 py-2 bg-background border border-border rounded-xl text-[13px] hover:border-accent hover:text-accent transition-all disabled:opacity-30">Normal</button>
                            <button onClick={() => applyFormat('bold')} disabled={isEnhancing} className="px-4 py-2 bg-background border border-border rounded-xl text-[13px] font-bold hover:border-accent hover:text-accent transition-all disabled:opacity-30">𝐁𝐨𝐥𝐝</button>
                            <button onClick={() => applyFormat('italic')} disabled={isEnhancing} className="px-4 py-2 bg-background border border-border rounded-xl text-[13px] italic hover:border-accent hover:text-accent transition-all disabled:opacity-30">𝘐𝘵𝘢𝘭𝘪𝘤</button>
                            <button onClick={() => applyFormat('boldItalic')} disabled={isEnhancing} className="px-4 py-2 bg-background border border-border rounded-xl text-[13px] font-bold italic hover:border-accent hover:text-accent transition-all disabled:opacity-30">𝘽𝙤𝙡𝙙 𝙄𝙩𝙖𝙡𝙞𝙘</button>
                            <button onClick={() => applyFormat('script')} disabled={isEnhancing} className="px-4 py-2 bg-background border border-border rounded-xl text-[13px] hover:border-accent hover:text-accent transition-all disabled:opacity-30">𝒮𝒸𝓇𝒾𝓅𝓉</button>
                            <div className="w-px h-8 bg-border mx-1" />
                            <button onClick={() => applyFormat('caps')} disabled={isEnhancing} className="px-4 py-2 bg-background border border-border rounded-xl text-[13px] hover:border-accent hover:text-accent transition-all disabled:opacity-30">ALL CAPS</button>
                            <button onClick={() => applyFormat('title')} disabled={isEnhancing} className="px-4 py-2 bg-background border border-border rounded-xl text-[13px] hover:border-accent hover:text-accent transition-all disabled:opacity-30">Title Case</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Emojis */}
                            <div className="bg-card/50 backdrop-blur-xl rounded-[24px] border border-border p-6 shadow-sm flex flex-wrap gap-2">
                                <div className="w-full mb-2">
                                    <span className="text-[11px] font-bold text-muted uppercase tracking-widest">Quick Emojis</span>
                                </div>
                                {QUICK_EMOJIS.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => addEmoji(emoji)}
                                        disabled={isEnhancing}
                                        className="text-[20px] p-2 hover:bg-background rounded-xl transition-colors disabled:opacity-30 disabled:grayscale"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>

                            {/* Cleaning */}
                            <div className="bg-card/50 backdrop-blur-xl rounded-[24px] border border-border p-6 shadow-sm">
                                <div className="w-full mb-4">
                                    <span className="text-[11px] font-bold text-muted uppercase tracking-widest">Cleaning Tools</span>
                                </div>
                                <div className="space-y-3">
                                    <button
                                        onClick={handleRemoveDashes}
                                        disabled={isEnhancing}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-background border border-border rounded-xl text-[13px] hover:border-danger hover:text-danger transition-all group disabled:opacity-30"
                                    >
                                        <span>Remove M-Size Hyphen</span>
                                        <span className="text-[10px] text-muted group-hover:text-danger opacity-60">— → (none)</span>
                                    </button>
                                    <button
                                        onClick={handleFixDashes}
                                        disabled={isEnhancing}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-background border border-border rounded-xl text-[13px] hover:border-accent hover:text-accent transition-all group disabled:opacity-30"
                                    >
                                        <span>Fix M-Size Hyphen</span>
                                        <span className="text-[10px] text-muted group-hover:text-accent opacity-60">— → -</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleCopy}
                                disabled={!input || isEnhancing}
                                className="flex items-center gap-2.5 bg-foreground text-background px-8 py-3.5 rounded-[18px] font-bold text-[14px] hover:opacity-90 active:scale-95 transition-all shadow-xl disabled:opacity-30"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                                Copy Formatted Text
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
