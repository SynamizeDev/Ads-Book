"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Select from "react-select";
import Toast from "../../components/Toast";
import {
    getAccounts,
    analyzeCreative,
    generateCreativeVariations,
    type Account,
    type CreativeAnalysis,
    type CreativeVariationResult,
} from "@/lib/api";

const ACCEPT_IMAGE = "image/png,image/jpeg,image/webp,image/gif";
const MAX_FILE_MB = 6;
const MAX_SIZE_PX = 1200;  // max width/height for upload (keeps payload small, avoids 413)
const JPEG_QUALITY = 0.82;

const IMAGE_MODEL_OPTIONS: { id: string; label: string; hint?: string }[] = [
    { id: "", label: "Auto", hint: "Try server defaults" },
    { id: "gemini-2.5-flash-image", label: "Nano Banana", hint: "Free tier" },
    { id: "gemini-3.1-flash-image-preview", label: "Nano Banana 2", hint: "If available" },
    { id: "gemini-2.0-flash-exp-image-generation", label: "Gemini 2.0 Flash (Image Generation) Experimental", hint: "Experimental" },
    { id: "gemini-3-pro-image-preview", label: "Nano Banana Pro", hint: "Pro image" },
];

const OPENAI_MODEL_OPTIONS: { id: string; label: string; hint?: string }[] = [
    { id: "dall-e-2", label: "DALL·E 2", hint: "1024×1024" },
];

const PROVIDER_OPTIONS: { value: "gemini" | "openai"; label: string }[] = [
    { value: "gemini", label: "Gemini" },
    { value: "openai", label: "OpenAI" },
];

const imageSelectStyles = {
    control: (base: object, state: { isFocused: boolean; isDisabled?: boolean }) => ({
        ...base,
        minHeight: 42,
        borderRadius: 12,
        borderColor: state.isFocused ? "var(--color-accent, hsl(var(--accent)))" : "var(--border)",
        backgroundColor: state.isDisabled ? "var(--muted)" : "var(--background)",
        boxShadow: state.isFocused ? "0 0 0 2px hsl(var(--accent) / 0.2)" : "none",
        opacity: state.isDisabled ? 0.8 : 1,
        cursor: state.isDisabled ? "not-allowed" : "pointer",
    }),
    menu: (base: object) => ({
        ...base,
        borderRadius: 12,
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        overflow: "hidden",
        zIndex: 9999,
    }),
    menuPortal: (base: object) => ({ ...base, zIndex: 9999 }),
    menuList: (base: object) => ({ ...base, padding: 6 }),
    option: (base: object, state: { isFocused: boolean; isSelected: boolean }) => ({
        ...base,
        fontSize: 13,
        padding: "10px 12px",
        borderRadius: 8,
        backgroundColor: state.isSelected ? "hsl(var(--accent) / 0.2)" : state.isFocused ? "var(--muted)" : "transparent",
        color: "var(--foreground)",
        cursor: "pointer",
    }),
    singleValue: (base: object) => ({ ...base, color: "var(--foreground)" }),
    placeholder: (base: object) => ({ ...base, color: "var(--muted-foreground)" }),
    input: (base: object) => ({ ...base, color: "var(--foreground)" }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base: object, state: { isDisabled?: boolean }) => ({
        ...base,
        color: "var(--muted-foreground)",
        padding: "8px",
        ...(state.isDisabled ? { display: "none" } : {}),
    }),
};

type ModelOption = { value: string; label: string };
function modelOptionsForProvider(provider: "gemini" | "openai"): ModelOption[] {
    const list = provider === "gemini" ? IMAGE_MODEL_OPTIONS : OPENAI_MODEL_OPTIONS;
    return list.map((opt) => ({
        value: opt.id,
        label: opt.hint ? `${opt.label} — ${opt.hint}` : opt.label,
    }));
}

function ImageModelSelect({
    imageProvider,
    imageGenModelId,
    setImageGenModelId,
    imageSelectStyles,
}: {
    imageProvider: "gemini" | "openai";
    imageGenModelId: string;
    setImageGenModelId: (v: string) => void;
    imageSelectStyles: object;
}) {
    const options = useMemo(() => modelOptionsForProvider(imageProvider), [imageProvider]);
    const effectiveId = imageProvider === "openai"
        ? (OPENAI_MODEL_OPTIONS.some((o) => o.id === imageGenModelId) ? imageGenModelId : "dall-e-2")
        : imageGenModelId;
    const value = options.find((o) => o.value === effectiveId) ?? options[0] ?? null;
    return (
        <Select<ModelOption>
            value={value}
            onChange={(opt) => setImageGenModelId(opt?.value ?? "")}
            options={options}
            placeholder="Select model"
            isClearable={false}
            styles={imageSelectStyles}
            classNamePrefix="image-model-select"
            menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
            menuPosition="fixed"
        />
    );
}

/** Compress image to JPEG and resize so request stays under body limit */
function compressImageForUpload(file: File): Promise<{ data: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            URL.revokeObjectURL(url);
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            let dw = w;
            let dh = h;
            if (w > MAX_SIZE_PX || h > MAX_SIZE_PX) {
                if (w >= h) {
                    dw = MAX_SIZE_PX;
                    dh = Math.round((h * MAX_SIZE_PX) / w);
                } else {
                    dh = MAX_SIZE_PX;
                    dw = Math.round((w * MAX_SIZE_PX) / h);
                }
            }
            const canvas = document.createElement("canvas");
            canvas.width = dw;
            canvas.height = dh;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Canvas not supported"));
                return;
            }
            ctx.drawImage(img, 0, 0, dw, dh);
            const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
            const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;
            resolve({ data: base64, mimeType: "image/jpeg" });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image"));
        };
        img.src = url;
    });
}

export default function ImageGeneratorPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [referenceImage, setReferenceImage] = useState<{ base64: string; mimeType: string } | null>(null);
    const [analysis, setAnalysis] = useState<CreativeAnalysis | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [creatives, setCreatives] = useState<CreativeVariationResult[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [imageGenModelId, setImageGenModelId] = useState("");
    const [imageProvider, setImageProvider] = useState<"gemini" | "openai">("gemini");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getAccounts().then((res) => {
            if (res.success && res.data) setAccounts(res.data);
        });
    }, []);

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            setToast({ message: `File must be under ${MAX_FILE_MB} MB`, type: "error" });
            return;
        }
        try {
            const { data, mimeType } = await compressImageForUpload(file);
            setReferenceImage({ base64: data, mimeType });
            setAnalysis(null);
            setCreatives([]);
        } catch {
            setToast({ message: "Failed to read image", type: "error" });
        }
        e.target.value = "";
    };

    const handleAnalyze = async () => {
        if (!referenceImage) {
            setToast({ message: "Upload a reference image first.", type: "error" });
            return;
        }
        setIsAnalyzing(true);
        setToast(null);
        try {
            const res = await analyzeCreative(referenceImage.base64, referenceImage.mimeType);
            if (res.success && res.data?.analysis) {
                setAnalysis(res.data.analysis);
                setShowAnalysis(true);
                setToast({ message: "Creative analyzed. Select accounts and generate.", type: "success" });
            } else {
                setToast({ message: res.error || "Analysis failed", type: "error" });
            }
        } catch {
            setToast({ message: "Request failed", type: "error" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleAccount = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else if (next.size < 5) next.add(id);
            return next;
        });
    };

    const handleGenerate = async () => {
        if (!analysis) {
            setToast({ message: "Analyze the reference image first.", type: "error" });
            return;
        }
        if (selectedIds.size === 0) {
            setToast({ message: "Select at least one account.", type: "error" });
            return;
        }
        setIsGenerating(true);
        setToast(null);
        setCreatives([]);
        try {
            const res = await generateCreativeVariations(analysis, Array.from(selectedIds), {
                imageModelId: imageGenModelId || undefined,
                imageProvider,
            });
            if (res.success && res.data?.creatives) {
                setCreatives(res.data.creatives);
                const ok = res.data.creatives.filter((c) => c.imageBase64).length;
                setToast({
                    message: ok ? `Generated ${ok} creative(s).` : "No images returned; model may not support image generation.",
                    type: ok ? "success" : "error",
                });
            } else {
                setToast({ message: res.error || "Generation failed", type: "error" });
            }
        } catch {
            setToast({ message: "Request failed", type: "error" });
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadCreative = (c: CreativeVariationResult) => {
        if (!c.imageBase64) return;
        const name = `creative_${(c.accountName || c.accountId).replace(/\s+/g, "_")}.png`;
        const link = document.createElement("a");
        link.href = `data:${c.mimeType || "image/png"};base64,${c.imageBase64}`;
        link.download = name;
        link.click();
    };

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-[900px] mx-auto px-10 pt-10">
                <div className="mb-10">
                    <h1 className="text-[26px] font-bold text-foreground tracking-tight mb-2">Ad Creative Generator</h1>
                    <p className="text-[14px] text-muted">
                        Upload one reference image, analyze it, then generate tailored creatives for each selected account.
                    </p>
                </div>

                <div className="space-y-8">
                    {/* Reference image */}
                    <div className="bg-card rounded-[24px] border border-border p-6 shadow-sm">
                        <p className="text-[13px] font-semibold text-muted uppercase tracking-wider mb-4">1. Reference image</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPT_IMAGE}
                            onChange={onFileChange}
                            className="hidden"
                        />
                        {!referenceImage ? (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full border-2 border-dashed border-border rounded-[18px] p-10 text-muted hover:border-accent hover:text-accent transition-all text-[14px]"
                            >
                                Click to upload (PNG, JPEG, WebP, GIF — max {MAX_FILE_MB} MB)
                            </button>
                        ) : (
                            <div className="flex flex-wrap items-start gap-6">
                                <img
                                    src={`data:${referenceImage.mimeType};base64,${referenceImage.base64}`}
                                    alt="Reference"
                                    className="w-40 h-40 object-cover rounded-[14px] border border-border"
                                />
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-[13px] text-accent hover:underline"
                                    >
                                        Change image
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAnalyze}
                                        disabled={isAnalyzing}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent font-medium text-[13px] disabled:opacity-50"
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Analyzing…
                                            </>
                                        ) : (
                                            "Analyze creative"
                                        )}
                                    </button>
                                </div>
                                <div className="ml-auto flex flex-col gap-4 w-full max-w-[280px]">
                                    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-4 shadow-sm hover:border-accent/30 hover:shadow-md transition-all duration-200">
                                        <p className="text-[11px] text-muted uppercase font-semibold mb-2">Image provider</p>
                                        <Select<{ value: "gemini" | "openai"; label: string }>
                                            value={PROVIDER_OPTIONS.find((o) => o.value === imageProvider) ?? null}
                                            onChange={(opt) => {
                                                const next = opt?.value ?? "gemini";
                                                setImageProvider(next);
                                                setImageGenModelId(next === "openai" ? "dall-e-2" : "");
                                            }}
                                            options={PROVIDER_OPTIONS}
                                            placeholder="Select provider"
                                            isClearable={false}
                                            styles={imageSelectStyles}
                                            classNamePrefix="image-provider-select"
                                            menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                                            menuPosition="fixed"
                                        />
                                    </div>
                                    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-4 shadow-sm hover:border-accent/30 hover:shadow-md transition-all duration-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </span>
                                            <div>
                                                <p className="text-[13px] font-semibold text-foreground">Image model</p>
                                                <p className="text-[11px] text-muted">{imageProvider === "gemini" ? "Gemini model" : "OpenAI model"}</p>
                                            </div>
                                        </div>
                                        <ImageModelSelect
                                            imageProvider={imageProvider}
                                            imageGenModelId={imageGenModelId}
                                            setImageGenModelId={setImageGenModelId}
                                            imageSelectStyles={imageSelectStyles}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Analysis (collapsible) */}
                    {analysis && (
                        <div className="bg-card rounded-[24px] border border-border p-6 shadow-sm">
                            <button
                                type="button"
                                onClick={() => setShowAnalysis((v) => !v)}
                                className="flex items-center gap-2 text-[13px] font-semibold text-muted uppercase tracking-wider"
                            >
                                {showAnalysis ? "Hide" : "Show"} blueprint
                            </button>
                            {showAnalysis && (
                                <pre className="mt-3 p-4 bg-background rounded-xl text-[12px] text-foreground overflow-auto max-h-48">
                                    {JSON.stringify(analysis, null, 2)}
                                </pre>
                            )}
                        </div>
                    )}

                    {/* Account selection */}
                    <div className="bg-card rounded-[24px] border border-border p-6 shadow-sm">
                        <p className="text-[13px] font-semibold text-muted uppercase tracking-wider mb-4">2. Select accounts (max 5)</p>
                        {accounts.length === 0 ? (
                            <p className="text-[14px] text-muted">No accounts. Add accounts from the sidebar.</p>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {accounts.slice(0, 10).map((acc) => (
                                    <label
                                        key={acc.id}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all text-[13px] ${
                                            selectedIds.has(acc.id)
                                                ? "border-accent bg-accent/10 text-accent"
                                                : "border-border bg-background text-foreground hover:border-accent/50"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(acc.id)}
                                            onChange={() => toggleAccount(acc.id)}
                                            className="sr-only"
                                        />
                                        <span className="truncate max-w-[180px]" title={acc.account_name}>{acc.account_name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Generate button */}
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={!analysis || selectedIds.size === 0 || isGenerating}
                            className="flex items-center gap-2.5 bg-foreground text-background px-8 py-3.5 rounded-[18px] font-bold text-[14px] hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Generating…
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Generate creatives
                                </>
                            )}
                        </button>
                    </div>

                    {/* Results */}
                    {creatives.length > 0 && (
                        <div className="bg-card rounded-[24px] border border-border p-6 shadow-sm">
                            <p className="text-[13px] font-semibold text-muted uppercase tracking-wider mb-4">Results</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {creatives.map((c) => (
                                    <div key={c.accountId} className="rounded-[18px] border border-border overflow-hidden bg-background">
                                        <div className="p-3 flex items-center justify-between gap-2">
                                            <p className="text-[13px] font-medium text-foreground truncate min-w-0" title={c.accountName}>
                                                {c.accountName}
                                            </p>
                                            <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-md bg-muted text-muted-foreground" title={c.provider === "openai" ? "Generated with OpenAI" : "Generated with Gemini"}>
                                                {c.provider === "openai" ? "OpenAI" : "Gemini"}
                                            </span>
                                        </div>
                                        {c.error ? (
                                            <div className="p-4 text-[12px] text-danger">{c.error}</div>
                                        ) : c.imageBase64 ? (
                                            <>
                                                <img
                                                    src={`data:${c.mimeType || "image/png"};base64,${c.imageBase64}`}
                                                    alt={c.accountName}
                                                    className="w-full aspect-square object-cover"
                                                />
                                                <div className="p-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadCreative(c)}
                                                        className="w-full py-2 rounded-xl bg-accent/10 text-accent font-medium text-[13px] hover:bg-accent/20"
                                                    >
                                                        Download
                                                    </button>
                                                </div>
                                            </>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
