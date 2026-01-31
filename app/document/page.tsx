"use client";

import { useState, useEffect } from "react";
import { Search, BookOpen, FileText, Calendar, User, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { LibraryHeader } from "@/components/document/LibraryHeader";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface Journal {
    id: string;
    title: string;
    author: string;
    year: string;
    file_url: string;
    created_at?: string;
}

export default function DocumentPage() {
    const [query, setQuery] = useState("");
    const [documents, setDocuments] = useState<Journal[]>([]);
    const [loading, setLoading] = useState(true); // Start loading true
    const [error, setError] = useState("");

    // Fetch documents on mount and search
    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async (searchQuery: string = "") => {
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append("q", searchQuery);

            const res = await fetch(`/api/documents?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch documents");

            const data = await res.json();
            setDocuments(data.documents || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error loading library");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchDocuments(query);
    };

    return (
        <div className="min-h-screen bg-[#020617] text-gray-100 selection:bg-emerald-500/30 font-sans pb-20">
            {/* Background Ambience (Same as Analysis/About) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-green-900/20 via-emerald-900/20 to-teal-900/20 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />
            </div>

            <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
                <LibraryHeader />

                {/* Search Bar */}
                <div className="mb-10 relative group max-w-2xl">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                    <div className="relative flex items-center bg-[#0A0A0A] rounded-xl border border-white/10 shadow-2xl">
                        <Search className="w-5 h-5 text-gray-500 ml-4" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            placeholder="Search journals by title or author..."
                            className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-gray-600 h-14 px-4 font-mono text-sm"
                        />
                        <Button
                            onClick={handleSearch}
                            disabled={loading}
                            className="mr-2 bg-white/10 hover:bg-white/20 text-white border-none"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                        </Button>
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="p-4 mb-8 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {/* Document Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence mode="popLayout">
                        {loading && documents.length === 0 ? (
                            // Skeletons
                            Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-64 rounded-xl bg-white/5 animate-pulse border border-white/5" />
                            ))
                        ) : documents.length > 0 ? (
                            documents.map((doc, i) => (
                                <motion.div
                                    key={doc.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="group relative flex flex-col h-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]"
                                >
                                    {/* Card Header Illustration/Icon */}
                                    <div className="h-32 bg-gradient-to-br from-emerald-900/20 to-teal-900/10 flex items-center justify-center relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
                                        <FileText className="w-12 h-12 text-emerald-500/40 group-hover:scale-110 transition-transform duration-500" />
                                        <Badge variant="outline" className="absolute top-3 right-3 bg-black/40 border-white/10 text-emerald-400 text-xs backdrop-blur-sm">
                                            PDF
                                        </Badge>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5 flex flex-col flex-1">
                                        <h3 className="text-lg font-bold text-gray-100 mb-2 line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors">
                                            {doc.title}
                                        </h3>

                                        <div className="mt-auto space-y-3">
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <User className="w-3.5 h-3.5" />
                                                <span className="truncate">{doc.author || "Unknown Author"}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>{doc.year || "N/A"}</span>
                                            </div>
                                        </div>

                                        <div className="pt-4 mt-4 border-t border-white/5">
                                            <a
                                                href={doc.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 hover:bg-emerald-500/10 text-gray-300 hover:text-emerald-400 rounded-lg text-sm font-medium transition-all group-hover:border-emerald-500/20 border border-transparent"
                                            >
                                                Open Document <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            !loading && (
                                <div className="col-span-full text-center py-20 text-gray-500">
                                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    No documents found matching "{query}".
                                </div>
                            )
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
