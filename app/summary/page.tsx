"use client";

import { useState, useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { Radar, BarChart3, ChevronLeft, Table as TableIcon, Activity, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// --- FULL DATASET ---
const performanceData = [
    {
        id: 1,
        title: "Sentence Chunking",
        scores: {
            hybrid: { precision: 0.16, recall: 0.56, fMeasure: 0.25, meteor: 0.30, correctness: 0.56 },
            vector: { precision: 0.16, recall: 0.41, fMeasure: 0.22, meteor: 0.26, correctness: 0.50 },
            graph: { precision: 0.07, recall: 0.55, fMeasure: 0.12, meteor: 0.18, correctness: 0.40 }
        }
    }
];

const METRICS = ['correctness', 'precision', 'recall', 'fMeasure', 'meteor'];
const METHODS = [
    { key: 'hybrid', name: 'Hybrid GraphRAG', color: 'bg-emerald-500', stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.2)' },
    { key: 'vector', name: 'Vector', color: 'bg-blue-500', stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.2)' },
    { key: 'graph', name: 'Graph', color: 'bg-indigo-500', stroke: '#6366f1', fill: 'rgba(99, 102, 241, 0.2)' },
];

// --- ANIMATED NUMBER COMPONENT ---
function AnimatedNumber({ value, decimals = 3, duration = 1.5, className = "" }: {
    value: number;
    decimals?: number;
    duration?: number;
    className?: string;
}) {
    const spring = useSpring(0, {
        stiffness: 50,
        damping: 20,
        duration: duration * 1000
    });
    const display = useTransform(spring, (v) => v.toFixed(decimals));
    const [displayValue, setDisplayValue] = useState("0.000");

    useEffect(() => {
        spring.set(value);
    }, [spring, value]);

    useEffect(() => {
        const unsubscribe = display.on("change", (v) => setDisplayValue(v));
        return unsubscribe;
    }, [display]);

    return <span className={className}>{displayValue}</span>;
}

// --- ANIMATED PROGRESS BAR ---
function AnimatedProgressBar({ value, maxValue = 0.5, delay = 0 }: {
    value: number;
    maxValue?: number;
    delay?: number;
}) {
    return (
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((value / maxValue) * 100, 100)}%` }}
                transition={{
                    duration: 1.2,
                    delay: delay,
                    ease: [0.16, 1, 0.3, 1] // easeOutExpo
                }}
            />
        </div>
    );
}

function calculateRadarPoints(scores: any, size: number) {
    const angleStep = (Math.PI * 2) / METRICS.length;
    const radius = size / 2;
    const center = size / 2;

    return METRICS.map((key, i) => {
        const val = scores[key] || 0;
        const angle = i * angleStep - Math.PI / 2;
        const r = val * radius * 0.85;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return { x, y };
    });
}

function RadarChart({ scores, size = 300, showMethods = ['hybrid'] }: { scores: any, size?: number, showMethods?: string[] }) {
    const center = size / 2;
    const radius = size / 2;
    const innerRadius = radius * 0.85;
    const angleStep = (Math.PI * 2) / METRICS.length;
    const rings = [0.25, 0.5, 0.75, 1.0];

    return (
        <div className="relative flex justify-center items-center">
            <svg width={size} height={size} className="overflow-visible">
                {/* Hexagonal Grid */}
                {rings.map(r => {
                    const points = METRICS.map((_, i) => {
                        const angle = i * angleStep - Math.PI / 2;
                        const x = center + innerRadius * r * Math.cos(angle);
                        const y = center + innerRadius * r * Math.sin(angle);
                        return `${x},${y}`;
                    }).join(' ');
                    return <polygon key={r} points={points} fill="none" stroke="rgba(255,255,255,0.05)" />;
                })}

                {/* Axes */}
                {METRICS.map((m, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    const x = center + innerRadius * Math.cos(angle);
                    const y = center + innerRadius * Math.sin(angle);
                    return (
                        <g key={m}>
                            <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.1)" />
                            <text
                                x={center + (innerRadius + 20) * Math.cos(angle)}
                                y={center + (innerRadius + 20) * Math.sin(angle)}
                                fill="#94a3b8" fontSize="10" textAnchor="middle" dominantBaseline="middle"
                                className="uppercase font-mono font-bold tracking-wider"
                            >
                                {m}
                            </text>
                        </g>
                    );
                })}

                {/* Method Polygons */}
                {showMethods.map(methodKey => {
                    const method = METHODS.find(m => m.key === methodKey);
                    if (!method) return null;
                    const pts = calculateRadarPoints((scores as any)[methodKey], size);
                    const pathData = pts.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x},${p.y}`).join(' ') + 'Z';

                    return (
                        <motion.path
                            key={methodKey}
                            d={pathData}
                            fill={method.fill}
                            stroke={method.stroke}
                            strokeWidth={2}
                            initial={{ opacity: 0, pathLength: 0 }}
                            animate={{ opacity: 1, pathLength: 1 }}
                            transition={{ duration: 0.8 }}
                        />
                    );
                })}
            </svg>
        </div>
    );
}

export default function SummaryPage() {
    const [selectedQuestion, setSelectedQuestion] = useState(1);
    const [visibleMethods, setVisibleMethods] = useState(['hybrid', 'vector']);
    // Scenario Analysis visible methods (for bar chart and table)
    const [scenarioMethods, setScenarioMethods] = useState(['hybrid', 'vector', 'graph']);

    const currentQData = performanceData.find(d => d.id === selectedQuestion) || performanceData[0];

    // Calculate Averages for Overview
    const averageScores: Record<string, any> = {};
    METHODS.forEach(m => {
        averageScores[m.key] = {};
        METRICS.forEach(metric => {
            const sum = performanceData.reduce((acc, curr) => acc + (curr.scores as any)[m.key][metric], 0);
            averageScores[m.key][metric] = sum / performanceData.length;
        });
    });

    const toggleMethod = (key: string) => {
        setVisibleMethods(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const toggleScenarioMethod = (key: string) => {
        setScenarioMethods(prev => {
            // Ensure at least one method is always visible
            if (prev.includes(key) && prev.length > 1) {
                return prev.filter(k => k !== key);
            } else if (!prev.includes(key)) {
                return [...prev, key];
            }
            return prev;
        });
    };

    return (
        <div className="min-h-screen bg-[#020617] text-gray-100 selection:bg-emerald-500/30 font-sans pb-20 overflow-x-hidden">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
            </div>

            <div className="container mx-auto px-8 md:px-12 py-12 md:py-16 max-w-7xl relative z-10 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="sm" className="bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 rounded-full gap-2">
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </Button>
                        </Link>
                        <div className="h-6 w-px bg-white/10" />
                        <h1 className="text-lg font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
                            Performance Summary
                        </h1>
                    </div>
                    <div className="hidden md:flex gap-2">
                        {METHODS.map(m => (
                            <div key={m.key} className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                <div className={`w-2 h-2 rounded-full ${m.color}`} />
                                <span className="text-xs text-gray-400">{m.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- 1. OVERVIEW GRID --- */}
                <div className="grid lg:grid-cols-12 gap-6 bg-black/40 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                    {/* Left: Radar (7 cols) */}
                    <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 relative min-h-[400px]">
                        <div className="absolute top-0 left-0">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                <Radar className="w-5 h-5 text-emerald-500" />
                                Global Average
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">Comparision across all questions</p>
                        </div>

                        <div className="mt-8 scale-110 lg:scale-125 transition-transform">
                            <RadarChart scores={averageScores} size={300} showMethods={visibleMethods} />
                        </div>

                        <div className="mt-8 flex gap-2">
                            {METHODS.map(m => (
                                <button
                                    key={m.key}
                                    onClick={() => toggleMethod(m.key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${visibleMethods.includes(m.key) ? `${m.color} text-white border-transparent bg-opacity-80` : 'bg-white/5 border-white/10 text-gray-400'}`}
                                >
                                    {m.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Metrics (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                        <div className="flex-1 bg-gradient-to-br from-emerald-900/10 to-teal-900/10 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-center">
                            <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                            <h3 className="text-emerald-400 font-mono text-xs uppercase tracking-wider mb-2 z-10">Champion Metric</h3>
                            <div className="z-10">
                                <AnimatedNumber
                                    value={averageScores['hybrid'].correctness}
                                    decimals={3}
                                    duration={2}
                                    className="text-6xl font-bold text-white tracking-tighter"
                                />
                                <Badge className="ml-3 bg-emerald-500 text-white border-none align-top">RAGAS Correctness</Badge>
                            </div>
                            <p className="text-sm text-gray-400 mt-4 leading-relaxed z-10">
                                Hybrid Graph RAG outperforms pure Vector search by
                                <span className="text-emerald-400 font-bold"> +{((averageScores['hybrid'].correctness - averageScores['vector'].correctness) / averageScores['vector'].correctness * 100).toFixed(1)}% </span>
                                in factual accuracy.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {/* Detailed List */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-blue-400" /> Metric Breakdown
                                </h4>
                                <div className="space-y-4">
                                    {['precision', 'recall'].map((metric, index) => (
                                        <div key={metric}>
                                            <div className="flex justify-between text-xs text-gray-400 mb-1 uppercase">
                                                <span>{metric}</span>
                                                <span>vs Vector</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-xl font-bold text-white w-16">
                                                    <AnimatedNumber
                                                        value={averageScores['hybrid'][metric]}
                                                        decimals={3}
                                                        duration={1.5}
                                                    />
                                                </div>
                                                <AnimatedProgressBar
                                                    value={averageScores['hybrid'][metric]}
                                                    maxValue={0.5}
                                                    delay={index * 0.3}
                                                />
                                                <span className={`text-xs w-12 text-right ${averageScores['hybrid'][metric] > averageScores['vector'][metric] ? 'text-green-400' : 'text-red-400'}`}>
                                                    {averageScores['hybrid'][metric] > averageScores['vector'][metric] ? '+' : ''}
                                                    {((averageScores['hybrid'][metric] - averageScores['vector'][metric]) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- 2. DETAILED ANALYSIS --- */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-bold text-white">Scenario Analysis</h2>
                            {/* Method Toggle for Scenario */}
                            <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                                {METHODS.map(m => {
                                    const isActive = scenarioMethods.includes(m.key);
                                    return (
                                        <button
                                            key={m.key}
                                            onClick={() => toggleScenarioMethod(m.key)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${isActive
                                                    ? `${m.color} text-white`
                                                    : 'text-gray-500 hover:text-gray-300'
                                                }`}
                                            title={isActive ? `Hide ${m.name}` : `Show ${m.name}`}
                                        >
                                            {isActive ? (
                                                <Eye className="w-3 h-3" />
                                            ) : (
                                                <EyeOff className="w-3 h-3" />
                                            )}
                                            <span className="hidden sm:inline">{m.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex bg-white/5 p-1 rounded-xl overflow-x-auto">
                            {performanceData.map(q => (
                                <button
                                    key={q.id}
                                    onClick={() => setSelectedQuestion(q.id)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedQuestion === q.id ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                >
                                    CASE {q.id}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Left: Bar Chart */}
                        <div className="bg-black/30 border border-white/10 rounded-3xl p-6 backdrop-blur-sm h-[400px] flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-purple-500" />
                                    Method Comparison
                                </h3>
                                <span className="text-xs text-gray-500">
                                    {scenarioMethods.length} of {METHODS.length} methods
                                </span>
                            </div>

                            {/* Grouped Bar Chart */}
                            <div className="flex-1 w-full flex items-end gap-4 px-2 pb-6 relative">
                                {/* Y-Axis lines */}
                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                    {[0, 0.25, 0.5, 0.75, 1].map(v => (
                                        <div key={v} className="w-full border-b border-white/5 h-0 relative">
                                            <span className="absolute -top-3 left-0 text-[9px] text-gray-600">{1 - v}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Groups - only show visible methods */}
                                {METRICS.slice(0, 4).map((metric) => (
                                    <div key={metric} className="flex-1 h-full flex flex-col justify-end z-10 group/metric">
                                        <div className="flex justify-between items-end h-full gap-[2px]">
                                            {METHODS.filter(m => scenarioMethods.includes(m.key)).map(m => {
                                                const val = (currentQData.scores as any)[m.key][metric];
                                                return (
                                                    <div key={m.key} className="w-full bg-white/5 rounded-t-sm relative group/bar h-full flex items-end">
                                                        <motion.div
                                                            layout
                                                            className={`w-full ${m.color} opacity-80 group-hover/bar:opacity-100 rounded-t-sm`}
                                                            initial={{ height: 0 }}
                                                            animate={{ height: `${val * 100}%` }}
                                                            transition={{ type: "spring", stiffness: 100 }}
                                                        />
                                                        {/* Tooltip */}
                                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 border border-white/20">
                                                            {m.name}: {val.toFixed(3)}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <span className="text-[10px] text-center text-gray-400 mt-2 uppercase font-mono tracking-tighter truncate">{metric}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Table */}
                        <div className="bg-black/30 border border-white/10 rounded-3xl p-6 backdrop-blur-sm overflow-hidden flex flex-col">
                            <h3 className="font-bold text-white flex items-center gap-2 mb-6">
                                <TableIcon className="w-5 h-5 text-gray-400" />
                                Score Data
                            </h3>
                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">Method</th>
                                            <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs uppercase text-emerald-500">Correctness</th>
                                            <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs uppercase">Precision</th>
                                            <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs uppercase">Recall</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {METHODS.filter(m => scenarioMethods.includes(m.key)).map(m => {
                                            const scores = (currentQData.scores as any)[m.key];
                                            const isHybrid = m.key === 'hybrid';
                                            return (
                                                <motion.tr
                                                    key={m.key}
                                                    className={`group hover:bg-white/5 transition-colors ${isHybrid ? 'bg-emerald-900/10' : ''}`}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${m.color}`} />
                                                            <span className={`text-gray-300 ${isHybrid ? 'font-bold text-white' : ''}`}>{m.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className={`py-3 px-4 text-right font-mono ${isHybrid ? 'text-emerald-400 font-bold' : 'text-gray-400'}`}>
                                                        {scores.correctness.toFixed(4)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono text-gray-400">
                                                        {scores.precision.toFixed(4)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono text-gray-400">
                                                        {scores.recall.toFixed(4)}
                                                    </td>
                                                </motion.tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/5">
                                <p className="text-xs text-gray-400 italic">
                                    * Precision, Recall, and F-Measure indicate lexical overlap. METEOR accounts for semantic similarity. Correctness evaluates factual accuracy.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
