"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            router.push("/");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30 relative overflow-hidden">
            {/* Animated Background Glows */}
            <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[150px] animate-pulse" />
            <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px]" />

            <div className="relative w-full max-w-md mx-4">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[20px] mb-5 shadow-2xl">
                        <span className="text-2xl font-black text-white tracking-tight">A</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Ads Book</h1>
                    <p className="text-slate-400 text-[15px]">Ad Performance Monitor</p>
                </div>

                {/* Login Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[28px] p-10 shadow-2xl">
                    <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
                    <p className="text-slate-400 text-[14px] mb-8">Sign in to your dashboard</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-[14px] px-4 py-3.5 text-white text-[15px] placeholder-slate-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full bg-white/5 border border-white/10 rounded-[14px] px-4 py-3.5 text-white text-[15px] placeholder-slate-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-[12px] px-4 py-3 text-red-400 text-[13px]">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3.5 rounded-[14px] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-[15px] shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-[12px] text-slate-600 mt-8">
                    Powered by Supabase Auth
                </p>
            </div>
        </div>
    );
}
