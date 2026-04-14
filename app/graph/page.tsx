"use client";

import { useState, useEffect, useCallback } from "react";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { GraphHeader } from "@/components/graph/GraphHeader";
import { Loader2, AlertCircle, RefreshCw, Filter, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const FILTER_TYPES = [
    { label: "Plant", value: "PLANT" },
    { label: "Compound", value: "COMPOUND" },
    { label: "Disease", value: "DISEASE" },
    { label: "Effect", value: "EFFECT" }
];

export default function GraphPage() {
    const [data, setData] = useState<{ nodes: any[], links: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
    const [limit, setLimit] = useState(50); // don't show too many items

    const fetchGraph = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            params.set("limit", limit.toString());
            if (selectedFilters.length > 0) {
                params.set("types", selectedFilters.join(","));
            }

            const res = await fetch(`/api/graph-data?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to load graph data");
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setData(json);
        } catch (err: any) {
            setError(err.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    }, [selectedFilters, limit]);

    useEffect(() => {
        fetchGraph();
    }, [fetchGraph]);

    const toggleFilter = (val: string) => {
        setSelectedFilters(prev => 
            prev.includes(val) ? prev.filter(f => f !== val) : [...prev, val]
        );
    };

    return (
        <div className="min-h-screen bg-[#020617] text-gray-100 selection:bg-emerald-500/30 font-sans pb-20">
            {/* Background Ambience */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-to-r from-emerald-900/10 via-cyan-900/10 to-blue-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />
            </div>

            <div className="container mx-auto px-8 md:px-12 py-12 md:py-16 max-w-7xl relative z-10 space-y-8">
                <GraphHeader />

                {/* Controls Area */}
                <div className="flex flex-col md:flex-row justify-between items-center bg-black/40 border border-white/10 rounded-2xl p-4 gap-4 backdrop-blur-sm z-20 relative">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-400 mr-2">
                            <Filter className="w-4 h-4" />
                            Filters:
                        </div>
                        {FILTER_TYPES.map(ft => {
                            const active = selectedFilters.includes(ft.value);
                            return (
                                <Badge 
                                    key={ft.value}
                                    variant="outline"
                                    className={`cursor-pointer px-3 py-1 text-xs border transition-all ${
                                        active 
                                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30' 
                                            : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-gray-300'
                                    }`}
                                    onClick={() => toggleFilter(ft.value)}
                                >
                                    {ft.label}
                                </Badge>
                            );
                        })}
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-end gap-4">
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Layers className="w-4 h-4" />
                            <span>Limit:</span>
                            <select 
                                value={limit} 
                                onChange={(e) => setLimit(Number(e.target.value))}
                                className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                            >
                                <option value={20}>20 Edge</option>
                                <option value={50}>50 Edge</option>
                                <option value={100}>100 Edge</option>
                            </select>
                        </div>
                        
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300 gap-2 font-mono h-8"
                            onClick={fetchGraph}
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            RANDOMIZE
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="p-4 mb-8 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="w-full h-[500px] flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl">
                        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                        <p className="text-gray-400 font-mono animate-pulse tracking-wide text-sm">Rerouting Knowledge Nodes...</p>
                    </div>
                ) : data ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black/40 backdrop-blur-md"
                    >
                        <GraphCanvas data={data} />
                    </motion.div>
                ) : null}

                {/* Info Section */}
                {!loading && data && (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-400 font-medium">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
                            <strong className="block text-white mb-2 text-lg">Nodes ({data.nodes.length})</strong>
                            Entities such as specific Plants, Chemical Compounds, or Diseases found in the knowledge base.
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
                            <strong className="block text-white mb-2 text-lg">Edges ({data.links.length})</strong>
                            Represent scientifically verified relationships like "contains", "treats", "upregulates", etc.
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
                            <strong className="block text-white mb-2 text-lg">Interactive</strong>
                            Hover and drag over any node to see its name and connection count. 
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
