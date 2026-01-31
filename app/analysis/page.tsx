"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// Components
import { AnalysisHeader } from "@/components/analysis/AnalysisHeader";
import { StatsOverview } from "@/components/analysis/StatsOverview";
import { AIAnswerCard } from "@/components/analysis/AIAnswerCard";
import { GraphVisualization } from "@/components/analysis/GraphVisualization";
import { VectorResults } from "@/components/analysis/VectorResults";
import { QueryAnalysis } from "@/components/analysis/QueryAnalysis";

interface SearchResults {
  query: string;
  queryEntities: any[];
  vectorResults: any[];
  graphResults: any;
  answer: string;
  summary: {
    totalChunks: number;
    totalHerbs: number;
    totalCompounds: number;
    totalEffects: number;
  };
}

export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
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
          // If cached, we stop here (unless q is different?)
          // Logic: mode=cached implies "show what you have".
          return;
        }
      } catch (e) {
        console.error("Failed to load cached results:", e);
      }
    }

    if (q) {
      setQuery(q);
      if (!loading && (!results || results.query !== q)) {
        handleSearch(q);
      }
    }
  }, [searchParams]);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    setError("");
    // Optional: Keep previous results while loading? Or clear? 
    // Clearing feels snappier for "new search".
    // setResults(null); 

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, topK: 5 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to search");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-gray-100 selection:bg-emerald-500/30 font-sans pb-20">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-green-900/20 via-emerald-900/20 to-teal-900/20 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {/* Header Section */}
        <AnalysisHeader query={results?.query || query || "Analysis"} />

        {/* Search Input */}
        <div className="mb-10 relative group max-w-2xl">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative flex items-center bg-[#0A0A0A] rounded-xl border border-white/10 shadow-2xl">
            <Search className="w-5 h-5 text-gray-500 ml-4" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Analyze another herbal query..."
              className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-gray-600 h-14 px-4 font-mono text-sm"
            />
            <Button
              onClick={() => handleSearch()}
              disabled={loading}
              className="mr-2 bg-white/10 hover:bg-white/20 text-white border-none"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5" />
            {error}
          </motion.div>
        )}

        {/* Loading Skeleton or Results */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-4"
            >
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
              <p className="text-emerald-500/50 font-mono animate-pulse">Running Hybrid Search Algorithms...</p>
            </motion.div>
          ) : results ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              {/* Top Stats */}
              <StatsOverview summary={results.summary} />

              {/* Main Content Grid */}
              <QueryAnalysis entities={results.queryEntities} />
              <AIAnswerCard answer={results.answer} />
              <GraphVisualization data={results.graphResults} />
              <VectorResults results={results.vectorResults} />
            </motion.div>
          ) : (
            <div className="text-center py-20 text-gray-700">
              Start by typing a query above...
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
