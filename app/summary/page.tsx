"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Radar, BarChart3, ChevronLeft, Table as TableIcon, Activity } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// --- FULL DATASET ---
const performanceData = [
    {
        id: 1,
        title: "Question 1",
        scores: {
            hybrid: { rouge1: 0.3115, rouge2: 0.0833, rougeL: 0.1967, meteor: 0.1966, correctness: 0.7785 },
            legacy: { rouge1: 0.1435, rouge2: 0.0255, rougeL: 0.0844, meteor: 0.1834, correctness: 0.5451 },
            vector: { rouge1: 0.2819, rouge2: 0.0272, rougeL: 0.1477, meteor: 0.2401, correctness: 0.7006 },
            graph: { rouge1: 0.1769, rouge2: 0.0552, rougeL: 0.1361, meteor: 0.1282, correctness: 0.3933 }
        }
    },
    {
        id: 2,
        title: "Question 2",
        scores: {
            hybrid: { rouge1: 0.4818, rouge2: 0.3556, rougeL: 0.3650, meteor: 0.4632, correctness: 0.6666 },
            legacy: { rouge1: 0.2159, rouge2: 0.0460, rougeL: 0.1477, meteor: 0.1918, correctness: 0.4266 },
            vector: { rouge1: 0.1838, rouge2: 0.0546, rougeL: 0.1081, meteor: 0.2243, correctness: 0.5134 },
            graph: { rouge1: 0.2293, rouge2: 0.0774, rougeL: 0.1274, meteor: 0.1686, correctness: 0.6031 }
        }
    },
    {
        id: 3,
        title: "Question 3",
        scores: {
            hybrid: { rouge1: 0.3218, rouge2: 0.1395, rougeL: 0.2069, meteor: 0.2454, correctness: 0.6710 },
            legacy: { rouge1: 0.2705, rouge2: 0.0390, rougeL: 0.1256, meteor: 0.2300, correctness: 0.3554 },
            vector: { rouge1: 0.3697, rouge2: 0.1340, rougeL: 0.2180, meteor: 0.2785, correctness: 0.6148 },
            graph: { rouge1: 0.2249, rouge2: 0.0240, rougeL: 0.1183, meteor: 0.1416, correctness: 0.4468 }
        }
    },
    {
        id: 4,
        title: "Question 4",
        scores: {
            hybrid: { rouge1: 0.2486, rouge2: 0.0656, rougeL: 0.1405, meteor: 0.2082, correctness: 0.5856 },
            legacy: { rouge1: 0.2167, rouge2: 0.0339, rougeL: 0.1167, meteor: 0.1769, correctness: 0.4502 },
            vector: { rouge1: 0.1946, rouge2: 0.0109, rougeL: 0.1081, meteor: 0.1408, correctness: 0.4001 },
            graph: { rouge1: 0.2000, rouge2: 0.0225, rougeL: 0.1111, meteor: 0.1356, correctness: 0.4504 }
        }
    },
    {
        id: 5,
        title: "Question 5",
        scores: {
            hybrid: { rouge1: 0.2394, rouge2: 0.0571, rougeL: 0.1690, meteor: 0.2284, correctness: 0.5752 },
            legacy: { rouge1: 0.1628, rouge2: 0.0235, rougeL: 0.0930, meteor: 0.1242, correctness: 0.5151 },
            vector: { rouge1: 0.2317, rouge2: 0.0370, rougeL: 0.1220, meteor: 0.1835, correctness: 0.4826 },
            graph: { rouge1: 0.1677, rouge2: 0.0131, rougeL: 0.0903, meteor: 0.1878, correctness: 0.3574 }
        }
    },
    {
        id: 6,
        title: "Question 6",
        scores: {
            hybrid: { rouge1: 0.2405, rouge2: 0.0769, rougeL: 0.1519, meteor: 0.2924, correctness: 0.6642 },
            legacy: { rouge1: 0.2045, rouge2: 0.0460, rougeL: 0.1250, meteor: 0.2382, correctness: 0.5744 },
            vector: { rouge1: 0.2727, rouge2: 0.0556, rougeL: 0.1636, meteor: 0.2109, correctness: 0.4054 },
            graph: { rouge1: 0.2222, rouge2: 0.0174, rougeL: 0.1026, meteor: 0.1438, correctness: 0.5092 }
        }
    }
];

const METRICS = ['correctness', 'rouge1', 'rougeL', 'meteor', 'rouge2']; // Reordered for visual balance
const METHODS = [
    { key: 'hybrid', name: 'Hybrid Graph', color: 'bg-emerald-500', stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.2)' },
    { key: 'legacy', name: 'Legacy', color: 'bg-gray-500', stroke: '#6b7280', fill: 'rgba(107, 114, 128, 0.2)' },
    { key: 'vector', name: 'Vector Only', color: 'bg-blue-500', stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.2)' },
    { key: 'graph', name: 'Graph Only', color: 'bg-indigo-500', stroke: '#6366f1', fill: 'rgba(99, 102, 241, 0.2)' },
];

function calculateRadarPoints(scores: any, size: number) {
    const angleStep = (Math.PI * 2) / METRICS.length;
    const radius = size / 2;
    const center = size / 2;

    return METRICS.map((key, i) => {
        const val = scores[key] || 0;
        const angle = i * angleStep - Math.PI / 2;
        const r = val * radius * 0.85; // slightly smaller to keep labels in check
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
                                <span className="text-6xl font-bold text-white tracking-tighter">
                                    {averageScores['hybrid'].correctness.toFixed(3)}
                                </span>
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
                                    {['rouge1', 'meteor'].map(metric => (
                                        <div key={metric}>
                                            <div className="flex justify-between text-xs text-gray-400 mb-1 uppercase">
                                                <span>{metric}</span>
                                                <span>vs Vector</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-xl font-bold text-white">
                                                    {(averageScores['hybrid'][metric]).toFixed(3)}
                                                </div>
                                                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500" style={{ width: `${(averageScores['hybrid'][metric] / 0.5) * 100}%` }} />
                                                </div>
                                                <span className={`text-xs ${averageScores['hybrid'][metric] > averageScores['vector'][metric] ? 'text-green-400' : 'text-red-400'}`}>
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
                        <h2 className="text-2xl font-bold text-white">Scenario Analysis</h2>
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

                                {/* Groups */}
                                {METRICS.slice(0, 4).map((metric) => (
                                    <div key={metric} className="flex-1 h-full flex flex-col justify-end z-10 group/metric">
                                        <div className="flex justify-between items-end h-full gap-[2px]">
                                            {METHODS.map(m => {
                                                const val = (currentQData.scores as any)[m.key][metric];
                                                // limit to max height 100% (assuming val <= 1)
                                                // If val > 1 (unlikely for these metrics), clip.
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
                                                            {val.toFixed(3)}
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
                                            <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs uppercase">ROUGE-1</th>
                                            <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs uppercase">METEOR</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {METHODS.map(m => {
                                            const scores = (currentQData.scores as any)[m.key];
                                            const isHybrid = m.key === 'hybrid';
                                            return (
                                                <tr key={m.key} className={`group hover:bg-white/5 transition-colors ${isHybrid ? 'bg-emerald-900/10' : ''}`}>
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
                                                        {scores.rouge1.toFixed(4)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono text-gray-400">
                                                        {scores.meteor.toFixed(4)}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/5">
                                <p className="text-xs text-gray-400 italic">
                                    * ROUGE scores indicate lexical overlap with expert answers. METEOR accounts for semantic similarity. RAGAS Correctness evaluates factual accuracy using LLM-as-a-judge.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
