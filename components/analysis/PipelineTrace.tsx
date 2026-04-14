"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Globe,
    Tags,
    GitBranch,
    Database,
    Trophy,
    Filter,
    Layers,
    Bot,
    Clock,
} from "lucide-react";

interface PipelineStep {
    step: number;
    name: string;
    description: string;
    input: any;
    output: any;
    status: "success" | "partial" | "skipped";
    durationMs?: number;
}

interface PipelineTraceProps {
    steps: PipelineStep[];
    totalDurationMs?: number;
    expandedQueries?: string[];
}

const STEP_ICONS = [Globe, Tags, GitBranch, Database, Trophy, Filter, Layers, Bot];
const STEP_COLORS = [
    "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
    "from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-400",
    "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400",
    "from-teal-500/20 to-teal-600/10 border-teal-500/30 text-teal-400",
    "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400",
    "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400",
    "from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400",
    "from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-400",
];

function StepCard({ step, index }: { step: PipelineStep; index: number }) {
    const [expanded, setExpanded] = useState(false);
    const Icon = STEP_ICONS[step.step] ?? Bot;
    const color = STEP_COLORS[step.step % STEP_COLORS.length];

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.07 }}
            className={`relative rounded-2xl border bg-gradient-to-br ${color} backdrop-blur-sm overflow-hidden`}
        >
            {/* Top connector line */}
            {index > 0 && (
                <div className="absolute -top-4 left-6 w-px h-4 bg-white/10" />
            )}

            <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-colors"
            >
                {/* Step number + icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono opacity-50 uppercase tracking-widest">
                            Step {step.step}
                        </span>
                        {step.status === "success" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : step.status === "partial" ? (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        ) : null}
                    </div>
                    <div className="font-semibold text-white text-sm truncate">{step.name}</div>
                    <div className="text-xs opacity-60 truncate mt-0.5">{step.description}</div>
                </div>

                {/* Duration + expand */}
                <div className="flex-shrink-0 flex items-center gap-3">
                    {step.durationMs !== undefined && (
                        <div className="flex items-center gap-1 text-xs opacity-50 font-mono">
                            <Clock className="w-3 h-3" />
                            {step.durationMs < 1000
                                ? `${step.durationMs}ms`
                                : `${(step.durationMs / 1000).toFixed(1)}s`}
                        </div>
                    )}
                    {expanded ? (
                        <ChevronUp className="w-4 h-4 opacity-50" />
                    ) : (
                        <ChevronDown className="w-4 h-4 opacity-50" />
                    )}
                </div>
            </button>

            {/* Expanded detail */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                            {/* Input */}
                            <div>
                                <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1 font-mono">
                                    Input
                                </div>
                                <pre className="text-xs font-mono bg-black/40 rounded-xl p-3 overflow-x-auto text-gray-300 whitespace-pre-wrap break-all max-h-48">
                                    {JSON.stringify(step.input, null, 2)}
                                </pre>
                            </div>
                            {/* Output */}
                            <div>
                                <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1 font-mono">
                                    Output
                                </div>
                                <pre className="text-xs font-mono bg-black/40 rounded-xl p-3 overflow-x-auto text-emerald-300 whitespace-pre-wrap break-all max-h-48">
                                    {JSON.stringify(step.output, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export function PipelineTrace({ steps, totalDurationMs, expandedQueries }: PipelineTraceProps) {
    const [allExpanded, setAllExpanded] = useState(false);

    if (!steps || steps.length === 0) return null;

    const successCount = steps.filter((s) => s.status === "success").length;
    const partialCount = steps.filter((s) => s.status === "partial").length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/10 bg-black/20 backdrop-blur-xl overflow-hidden"
        >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">
                            Hybrid RAG Pipeline Trace
                        </h2>
                        <p className="text-xs text-indigo-400/60 font-mono">
                            MQE → VECTOR + GRAPH → RERANKING → DEDUPLICATION → CONSTRUCTION
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
                        <span className="text-emerald-400">✓ {successCount}</span>
                        {partialCount > 0 && (
                            <span className="text-amber-400">⚠ {partialCount}</span>
                        )}
                        {totalDurationMs && (
                            <span className="text-gray-500">
                                {(totalDurationMs / 1000).toFixed(1)}s total
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* MQE expanded queries banner */}
            {expandedQueries && expandedQueries.length > 1 && (
                <div className="px-6 py-3 bg-cyan-500/5 border-b border-cyan-500/10">
                    <div className="text-xs text-cyan-400/70 font-mono mb-1 uppercase tracking-widest">
                        Multi-Query Expansion — {expandedQueries.length} queries
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {expandedQueries.map((q, i) => (
                            <span
                                key={i}
                                className={`text-xs px-2 py-1 rounded-lg font-mono ${
                                    i === 0
                                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                        : "bg-white/5 text-gray-400 border border-white/10"
                                }`}
                            >
                                {i === 0 ? "📍 " : `${i + 1}. `}{q}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Steps */}
            <div className="p-6 space-y-3">
                {steps.map((step, i) => (
                    <StepCard key={step.step} step={step} index={i} />
                ))}
            </div>
        </motion.div>
    );
}
