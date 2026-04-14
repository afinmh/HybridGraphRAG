"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    Loader2, Search, AlertCircle, ChevronDown, ChevronUp,
    GitBranch, Database, Filter, Layers, BookOpen,
    ArrowRight, Hash, BarChart2, Clock, Sparkles, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalysisResult {
    query: string;
    translatedQuery?: string;
    queryEntities?: any[];
    expandedQueries?: string[];
    vectorResults?: any[];
    graphResults?: any;
    rawRetrievalData?: any[]; // per-query raw data
    contextText?: string;
    answer: string;
    summary?: any;
    pipeline?: any[];
    totalDurationMs?: number;
}

// ─── Get pipeline step data (supports both new .data and old .output format) ──
function getStepData(pipeline: any[] | undefined, stepNum: number): any {
    const step = pipeline?.find((s) => s.step === stepNum);
    return step?.data ?? step?.output ?? null;
}

// ─── Loading ──────────────────────────────────────────────────────────────────
const LOADING_STEPS = [
    "Menerjemahkan query...", "Mengekstrak entitas...", "Multi-Query Expansion...",
    "Vector + Graph Retrieval...", "Reranking hasil...", "Deduplikasi graph...",
    "Membangun konteks...", "Generating AI answer...",
];
function LoadingView() {
    const [step, setStep] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 1800);
        return () => clearInterval(t);
    }, []);
    return (
        <div className="flex flex-col items-center py-24 gap-6">
            <div className="relative">
                <Loader2 className="w-14 h-14 text-emerald-500 animate-spin" />
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
            </div>
            <div className="text-center space-y-3">
                <p className="text-emerald-400 font-mono text-sm animate-pulse">{LOADING_STEPS[step]}</p>
                <div className="flex gap-1 justify-center">
                    {LOADING_STEPS.map((_, i) => (
                        <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= step ? "w-6 bg-emerald-500" : "w-2 bg-white/10"}`} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
    emerald: "border-emerald-500/25 text-emerald-400",
    cyan: "border-cyan-500/25 text-cyan-400",
    violet: "border-violet-500/25 text-violet-400",
    teal: "border-teal-500/25 text-teal-400",
    amber: "border-amber-500/25 text-amber-400",
    orange: "border-orange-500/25 text-orange-400",
};

function Section({ icon: Icon, step, title, badge, color = "emerald", children, defaultOpen = true }: {
    icon: any; step?: number; title: string; badge?: string; color?: string;
    children: React.ReactNode; defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const c = COLOR_MAP[color] || COLOR_MAP.emerald;
    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border ${c} bg-white/[0.02] backdrop-blur-sm overflow-hidden`}
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors text-left"
            >
                {step !== undefined && (
                    <span className="text-[10px] font-mono text-gray-600 w-5 text-center flex-shrink-0">
                        {step}
                    </span>
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold text-white text-sm flex-1">{title}</span>
                {badge && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-gray-400 flex-shrink-0">
                        {badge}
                    </span>
                )}
                {open ? <ChevronUp className="w-4 h-4 opacity-40 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 opacity-40 flex-shrink-0" />}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 pt-1 border-t border-white/5">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, highlight }: { label: string; value: string | number; sub?: string; highlight?: boolean }) {
    return (
        <div className={`flex-1 min-w-[90px] rounded-xl p-4 text-center border ${highlight ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/5"}`}>
            <div className={`text-2xl font-bold font-mono ${highlight ? "text-emerald-400" : "text-white"}`}>{value}</div>
            <div className="text-[11px] text-gray-400 mt-1 leading-tight">{label}</div>
            {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
        </div>
    );
}

// ─── Chunk Card ───────────────────────────────────────────────────────────────
function ChunkCard({ rank, text, similarity, journal }: { rank?: number; text: string; similarity: number; journal?: string | null }) {
    const pct = Math.round(Math.min(similarity, 1) * 100);
    const barColor = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
    const scoreColor = pct >= 70 ? "text-emerald-400" : pct >= 40 ? "text-amber-400" : "text-red-400";
    return (
        <div className="rounded-xl bg-black/30 border border-white/10 p-3 space-y-2">
            <div className="flex items-center gap-2">
                {rank !== undefined && (
                    <span className="text-[10px] font-mono text-gray-600 w-5 flex-shrink-0 text-center">#{rank}</span>
                )}
                <div className="flex-1 min-w-0">
                    {journal && (
                        <div className="text-[10px] font-mono text-emerald-400/70 truncate flex items-center gap-1">
                            <BookOpen className="w-3 h-3 flex-shrink-0" />{journal}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-[11px] font-mono font-bold ${scoreColor} w-10 text-right`}>
                        {similarity.toFixed(3)}
                    </span>
                </div>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed line-clamp-5 pl-5">{text}</p>
        </div>
    );
}

// ─── Graph Relation Row ───────────────────────────────────────────────────────
function RelationRow({ rel, index }: { rel: string; index: number }) {
    const clean = rel.replace(/\.$/, "");
    const parts = clean.split(" ");
    const src = parts[0] ?? "";
    const verb = parts[1] ?? "→";
    const tgt = parts.slice(2).join(" ");
    return (
        <div className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0 flex-wrap">
            <span className="text-[10px] font-mono text-gray-600 w-5 text-right flex-shrink-0">{index + 1}.</span>
            <span className="text-cyan-300 text-xs font-medium">{src}</span>
            <ArrowRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">{verb}</span>
            <ArrowRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
            <span className="text-violet-300 text-xs font-medium">{tgt}</span>
        </div>
    );
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function AnalysisContent() {
    const searchParams = useSearchParams();
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const q = searchParams.get("q");
        const mode = searchParams.get("mode");
        if (mode === "cached") {
            try {
                const cached = localStorage.getItem("latest_query_detail");
                if (cached) {
                    const parsed = JSON.parse(cached);
                    setResults(parsed);
                    if (parsed.query) setQuery(parsed.query);
                    return;
                }
            } catch { }
        }
        if (q) {
            setQuery(q);
            if (!results || results.query !== q) handleSearch(q);
        }
    }, [searchParams]);

    const handleSearch = async (sq?: string) => {
        const q = sq || query;
        if (!q.trim()) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: q, topK: 15 }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
            const data = await res.json();
            setResults(data);
            try { localStorage.setItem("latest_query_detail", JSON.stringify(data)); } catch { }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Search failed");
        } finally { setLoading(false); }
    };

    // ── Derive display data ───────────────────────────────────────────────────
    const pipe = results?.pipeline;

    // Support both new .data and old .output format
    const mqeData = getStepData(pipe, 2);
    const rtvData = getStepData(pipe, 3);
    const rerankData = getStepData(pipe, 4);
    const dedupData = getStepData(pipe, 5);
    const ctxData = getStepData(pipe, 6);

    // Expanded queries
    const expandedQueries: string[] = mqeData?.queries ?? mqeData?.expandedQueries ?? results?.expandedQueries ?? [];

    // Raw retrieval per-query (support both .perQuery and root rawRetrievalData)
    const perQuery: any[] = rtvData?.perQuery ?? results?.rawRetrievalData ?? [];
    const totalRawChunks: number = rtvData?.totalRawChunks ?? perQuery.reduce((s: number, e: any) => s + (e.chunks?.length ?? 0), 0);
    const totalRawRels: number = rtvData?.totalRawGraphRels ?? perQuery.reduce((s: number, e: any) => s + (e.graphRels?.length ?? 0), 0);

    // Reranked chunks
    const rankedChunks: any[] = rerankData?.rankedChunks
        ?? (results?.vectorResults?.map((v: any, i: number) => ({
            rank: i + 1,
            text: v.text ?? v.text_content ?? "",
            similarity: Number(v.similarity ?? 0),
            journal: v.journal?.title ?? null,
        })) ?? []);
    const rerankInputCount: number = rerankData?.inputCount ?? totalRawChunks;

    // Unique graph relations
    const uniqueRels: string[] = dedupData?.relations ?? results?.graphResults?.rawRelationStrings ?? [];
    const dedupInputCount: number = dedupData?.inputCount ?? totalRawRels;

    // Context text
    const contextText: string = ctxData?.contextText ?? results?.contextText ?? "";
    const journals: string[] = ctxData?.journals ?? [];

    const summary = results?.summary;
    const totalMs = results?.totalDurationMs;

    return (
        <div className="min-h-screen bg-[#020617] text-gray-100 font-sans pb-24">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-r from-green-900/15 via-emerald-900/15 to-teal-900/15 rounded-full blur-[140px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 space-y-6">
                {/* Header */}
                <div>
                    <div className="text-[11px] font-mono text-emerald-500/60 uppercase tracking-widest mb-1">
                        Hybrid RAG · Pipeline Analysis
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                        {results?.query || "Analisis Pipeline"}
                    </h1>
                    {totalMs && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 font-mono">
                            <Clock className="w-3 h-3" />{(totalMs / 1000).toFixed(1)}s total pipeline
                        </div>
                    )}
                </div>

                {/* Search */}
                <div className="relative flex items-center bg-black/50 border border-white/10 rounded-xl">
                    <Search className="w-4 h-4 text-gray-500 ml-4 flex-shrink-0" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="Analisis query herbal lain..."
                        className="flex-1 bg-transparent h-12 px-4 text-sm text-white placeholder-gray-600 focus:outline-none font-mono"
                    />
                    <Button onClick={() => handleSearch()} disabled={loading} size="sm" className="mr-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Analisis"}
                    </Button>
                </div>

                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-3 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                    </div>
                )}

                {loading && <LoadingView />}

                {!loading && results && (
                    <div className="space-y-4">

                        {/* ── Stats ── */}
                        {summary && (
                            <div className="flex gap-3 flex-wrap">
                                <StatCard label="Relevant Chunks" value={summary.totalChunks ?? rankedChunks.length} highlight />
                                <StatCard
                                    label="Unique Sources"
                                    value={summary.totalSources > 0
                                        ? summary.totalSources
                                        : journals.length > 0 ? journals.length : (summary.totalChunks ?? rankedChunks.length)}
                                    sub="journals / chunks"
                                />
                                <StatCard label="Graph Relations" value={summary.totalGraphRelations ?? uniqueRels.length} />
                                <StatCard
                                    label="Graph Entities"
                                    value={summary.totalEntities > 0 ? summary.totalEntities : perQuery.reduce((s: number, e: any) => s + (e.graphEntities?.length ?? 0), 0) || queryEntitiesCount(results)}
                                />
                                {totalMs && <StatCard label="Pipeline Time" value={`${(totalMs / 1000).toFixed(1)}s`} />}
                            </div>
                        )}

                        {/* ── SECTION 1: Q&A ── */}
                        <Section icon={Sparkles} step={7} title="Pertanyaan & Jawaban AI" color="emerald">
                            <div className="space-y-4 pt-2">
                                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                                    <Hash className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <div className="text-[10px] font-mono text-gray-500 mb-1">QUERY</div>
                                        <p className="text-white font-medium text-sm">{results.query}</p>
                                        {results.translatedQuery && results.translatedQuery !== results.query && (
                                            <p className="text-xs text-gray-500 mt-1 font-mono">→ EN: {results.translatedQuery}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="prose prose-invert prose-emerald max-w-none text-sm leading-relaxed">
                                    <ReactMarkdown components={{
                                        p: ({ children }) => <p className="mb-3 text-gray-300 leading-7">{children}</p>,
                                        strong: ({ children }) => <strong className="text-emerald-300 font-semibold">{children}</strong>,
                                        ul: ({ children }) => <ul className="list-disc ml-4 mb-3 space-y-1 text-gray-300">{children}</ul>,
                                        li: ({ children }) => <li className="pl-1">{children}</li>,
                                        h3: ({ children }) => <h3 className="text-base font-bold text-white mt-4 mb-2">{children}</h3>,
                                    }}>{results.answer}</ReactMarkdown>
                                </div>
                            </div>
                        </Section>

                        {/* ── SECTION 2: MQE ── */}
                        {expandedQueries.length > 0 && (
                            <Section icon={GitBranch} step={2} title="Multi-Query Expansion (MQE)" badge={`${expandedQueries.length} queries`} color="cyan">
                                <div className="space-y-2 pt-2">
                                    {expandedQueries.map((q, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-black/30 border border-white/10">
                                            <span className={`text-[10px] font-mono w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${i === 0 ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/5 text-gray-500"}`}>
                                                {i + 1}
                                            </span>
                                            <span className={`text-sm ${i === 0 ? "text-cyan-300 font-medium" : "text-gray-400"}`}>
                                                {q}
                                                {i === 0 && <span className="ml-2 text-[10px] font-mono text-cyan-600">← original</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* ── SECTION 3: RAW RETRIEVAL ── */}
                        <Section
                            icon={Database}
                            step={3}
                            title="Data Mentah Retrieval (Vector + Graph)"
                            badge={`${totalRawChunks} chunks mentah · ${totalRawRels} rels mentah`}
                            color="violet"
                            defaultOpen={true}
                        >
                            {perQuery.length === 0 ? (
                                <p className="text-xs text-gray-500 italic pt-2">Data retrieval mentah tidak tersedia (load ulang query)</p>
                            ) : (
                                <div className="space-y-8 pt-2">
                                    {perQuery.map((entry: any, qi: number) => (
                                        <div key={qi} className="space-y-3">
                                            {/* Query header */}
                                            <div className="flex items-center gap-2 pb-1 border-b border-white/10">
                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/30">
                                                    Query {qi + 1}
                                                </span>
                                                <span className="text-sm text-violet-300 font-medium">{entry.query}</span>
                                                {entry.graphEntities?.length > 0 && (
                                                    <div className="ml-auto flex gap-1 flex-wrap justify-end">
                                                        {entry.graphEntities.map((e: string, ei: number) => (
                                                            <span key={ei} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 border border-white/10 font-mono">
                                                                {e}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Vector chunks */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-500 uppercase tracking-widest">
                                                        <BarChart2 className="w-3 h-3" />
                                                        Vector — {entry.chunks?.length ?? 0} chunks
                                                    </div>
                                                    {(entry.chunks ?? []).length === 0 ? (
                                                        <p className="text-xs text-gray-600 italic p-2">Tidak ada chunk ditemukan</p>
                                                    ) : (
                                                        <>
                                                            {(entry.chunks ?? []).map((c: any, ci: number) => (
                                                                <ChunkCard key={ci} text={c.text} similarity={c.similarity} journal={c.journal} />
                                                            ))}
                                                        </>
                                                    )}
                                                </div>

                                                {/* Graph relations */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-500 uppercase tracking-widest">
                                                        <GitBranch className="w-3 h-3" />
                                                        Graph — {entry.graphRels?.length ?? 0} relasi
                                                    </div>
                                                    <div className="bg-black/30 rounded-xl border border-white/10 p-3 min-h-[60px]">
                                                        {(entry.graphRels ?? []).length === 0 ? (
                                                            <p className="text-xs text-gray-600 italic">Tidak ada relasi ditemukan</p>
                                                        ) : (
                                                            (entry.graphRels ?? []).map((r: string, ri: number) => (
                                                                <RelationRow key={ri} rel={r} index={ri} />
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Section>

                        {/* ── SECTION 4: RERANKING ── */}
                        {rankedChunks.length > 0 && (
                            <Section
                                icon={Filter}
                                step={4}
                                title="Reranking Vector (Setelah Deduplikasi)"
                                badge={`top ${rankedChunks.length} dari ${rerankInputCount} unique chunks`}
                                color="teal"
                            >
                                <div className="space-y-2 pt-2">
                                    {rankedChunks.map((c: any, i: number) => (
                                        <ChunkCard key={i} rank={c.rank ?? i + 1} text={c.text} similarity={c.similarity} journal={c.journal} />
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* ── SECTION 5: GRAPH DEDUPLICATION ── */}
                        {uniqueRels.length > 0 && (
                            <Section
                                icon={Activity}
                                step={5}
                                title="Deduplikasi Graph Relations"
                                badge={`${uniqueRels.length} unique dari ${dedupInputCount} raw`}
                                color="amber"
                            >
                                <div className="bg-black/30 rounded-xl border border-white/10 p-4 mt-2">
                                    {uniqueRels.map((r, i) => (
                                        <RelationRow key={i} rel={r} index={i} />
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* ── SECTION 6: CONTEXT CONSTRUCTION ── */}
                        {contextText && (
                            <Section
                                icon={Layers}
                                step={6}
                                title="Context Construction (teks final ke LLM)"
                                badge={`${rankedChunks.length} chunks + ${uniqueRels.length} graph rels`}
                                color="orange"
                                defaultOpen={false}
                            >
                                <div className="mt-2">
                                    {journals.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {journals.map((j, i) => (
                                                <span key={i} className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                                    <BookOpen className="w-2.5 h-2.5" />{j}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <pre className="text-xs font-mono text-gray-300 bg-black/50 rounded-xl border border-white/10 p-4 overflow-x-auto whitespace-pre-wrap leading-6 max-h-[500px] overflow-y-auto">
                                        {contextText}
                                    </pre>
                                </div>
                            </Section>
                        )}

                    </div>
                )}

                {!loading && !results && (
                    <div className="text-center py-20 text-gray-700 text-sm">
                        Ketik query di atas untuk memulai analisis...
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper untuk count entities dari queryEntities
function queryEntitiesCount(results: AnalysisResult): number {
    return results?.queryEntities?.length ?? 0;
}

export default function AnalysisPage() {
    return (
        <Suspense fallback={
            <div className="w-full h-screen flex items-center justify-center bg-[#020617]">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            </div>
        }>
            <AnalysisContent />
        </Suspense>
    );
}
