"use client";

import { useState, useEffect } from "react";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { GraphHeader } from "@/components/graph/GraphHeader";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function GraphPage() {
    const [data, setData] = useState<{ nodes: any[], links: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchGraph = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/graph-data");
            if (!res.ok) throw new Error("Failed to load graph data");
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setData(json);
        } catch (err: any) {
            setError(err.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGraph();
    }, []);

    return (
        <div className="min-h-screen bg-[#020617] text-gray-100 selection:bg-emerald-500/30 font-sans pb-20">
            {/* Background Ambience */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-to-r from-emerald-900/10 via-cyan-900/10 to-blue-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />
            </div>

            <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
                <div className="flex justify-between items-start">
                    <GraphHeader />
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchGraph}
                        disabled={loading}
                        className="mt-8 border-white/10 bg-white/5 hover:bg-emerald-500/20 text-emerald-400"
                        title="Reload Graph"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {error && (
                    <div className="p-4 mb-8 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="w-full h-[400px] flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm">
                        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                        <p className="text-gray-400 font-mono animate-pulse">Calculating Molecular Forces...</p>
                    </div>
                ) : data ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <GraphCanvas data={data} />
                    </motion.div>
                ) : null}

                {/* Info Section */}
                {!loading && data && (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-400">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <strong className="block text-white mb-1">Nodes ({data.nodes.length})</strong>
                            Entities such as specific Plants, Chemical Compounds, or Diseases found in the knowledge base.
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <strong className="block text-white mb-1">Edges ({data.links.length})</strong>
                            Represent scientifically verified relationships like "contains", "treats", "upregulates", etc.
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <strong className="block text-white mb-1">Interaction</strong>
                            Hover over any node to see its name and connection count. The graph is generated using a force-directed layout.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
