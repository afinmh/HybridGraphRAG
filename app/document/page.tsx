"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Search, ArrowLeft, Book, User as UserIcon, Calendar, FileText, ExternalLink, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Live2DViewer from "@/components/document/Live2DViewer";
import { Button } from "@/components/ui/button";

interface Journal {
    id: string;
    title: string;
    author: string;
    year: string;
    file_url: string;
}

// --- GAME-STYLE DIALOG BOX COMPONENT ---
interface DialogBoxProps {
    searchQuery: string;
    resultCount: number;
    isSearching: boolean;
    hasSearched: boolean;
}

function GameDialogBox({ searchQuery, resultCount, isSearching, hasSearched }: DialogBoxProps) {
    const [displayedText, setDisplayedText] = useState("");
    const [isTyping, setIsTyping] = useState(true);
    const [isModelLoaded, setIsModelLoaded] = useState(false);

    // Determine the text to display based on state
    const getDialogText = () => {
        if (isSearching) {
            return "Tunggu sebentar ya, aku sedang mencari jurnal yang kamu minta...";
        }
        if (hasSearched && searchQuery) {
            if (resultCount > 0) {
                return `Berikut ${resultCount} jurnal yang berkaitan dengan "${searchQuery}". Silakan pilih yang ingin kamu baca!`;
            } else {
                return `Maaf, aku tidak menemukan jurnal dengan kata kunci "${searchQuery}". Coba kata kunci lain ya!`;
            }
        }
        return "Selamat datang di perpustakaan digital Sumber Herbal! Ada yang bisa saya bantu?";
    };

    const fullText = getDialogText();

    // Wait for model to load (simulate with delay)
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsModelLoaded(true);
        }, 2500); // Wait 2.5 seconds for model to appear

        return () => clearTimeout(timer);
    }, []);

    // Typewriter effect
    useEffect(() => {
        if (!isModelLoaded) return;

        let index = 0;
        setDisplayedText("");
        setIsTyping(true);

        const typeInterval = setInterval(() => {
            if (index < fullText.length) {
                setDisplayedText(fullText.slice(0, index + 1));
                index++;
            } else {
                setIsTyping(false);
                clearInterval(typeInterval);
            }
        }, 35); // Speed of typing

        return () => clearInterval(typeInterval);
    }, [fullText, isModelLoaded]);

    // Don't show until model is loaded
    if (!isModelLoaded) return null;

    return (
        <motion.div
            className="absolute bottom-8 left-4 right-4 z-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* Dialog Box Container */}
            <div className="relative">
                {/* Character Name Tag */}
                <div className="absolute -top-3 left-4 z-10">
                    <div className="bg-emerald-600 px-4 py-1 rounded-t-lg border-2 border-emerald-400 shadow-lg">
                        <span className="text-white text-xs font-bold tracking-wide">Arxip</span>
                    </div>
                </div>

                {/* Main Dialog Box */}
                <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-md rounded-xl border-2 border-emerald-500/50 shadow-2xl shadow-emerald-900/30 p-5 pt-6 relative overflow-hidden">
                    {/* Decorative Corner Elements */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />

                    {/* Inner Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5 pointer-events-none" />

                    {/* Text Content */}
                    <p className="text-gray-100 text-sm leading-relaxed font-medium min-h-[3rem] relative z-10">
                        {displayedText}
                        {/* Blinking Cursor */}
                        {isTyping && (
                            <span className="inline-block w-2 h-4 bg-emerald-400 ml-1 animate-pulse" />
                        )}
                    </p>

                    {/* Continue Indicator */}
                    {!isTyping && (
                        <motion.div
                            className="absolute bottom-2 right-3 flex items-center gap-1 text-emerald-400/70"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            <span className="text-[10px] font-mono">▼</span>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default function DocumentPage() {
    const [query, setQuery] = useState("");
    const [documents, setDocuments] = useState<Journal[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [lastSearchQuery, setLastSearchQuery] = useState("");

    // Pagination state
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 6;

    const totalPages = Math.ceil(documents.length / ITEMS_PER_PAGE);
    const displayedDocs = documents.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    // Initial Fetch
    useEffect(() => {
        const fetchInit = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/documents`);
                const data = await res.json();
                setDocuments(data.documents || []);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInit();
    }, []);

    const handleSearch = async () => {
        // Allow empty search to reset? Or just trim
        setIsLoading(true);
        setPage(1); // Reset to first page on new search
        setLastSearchQuery(query); // Track what was searched
        try {
            const params = new URLSearchParams({ q: query });
            const res = await fetch(`/api/documents?${params.toString()}`);
            const data = await res.json();
            setDocuments(data.documents || []);
            setHasSearched(true); // Mark that a search was performed
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex overflow-hidden bg-black selection:bg-emerald-500/30">

            {/* --- LEFT PANEL: VISUAL / CHARACTER --- */}
            <div className="relative w-full md:w-[45%] lg:w-[40%] h-full hidden md:block">
                {/* Background */}
                <div className="absolute inset-0">
                    <Image
                        src="/dokumen/library.webp"
                        alt="Library Background"
                        fill
                        className="object-cover opacity-60"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-black/40" />
                </div>

                {/* Character */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    <Live2DViewer modelPath="/natori/runtime/natori_pro_t06.model3.json" />
                </div>

                {/* Game-style Dialog Box */}
                <GameDialogBox
                    searchQuery={lastSearchQuery}
                    resultCount={documents.length}
                    isSearching={isLoading}
                    hasSearched={hasSearched}
                />

                {/* Navbar Overlay on Left */}
                <div className="absolute top-6 left-6 z-20">
                    <Link href="/">
                        <Button variant="ghost" size="sm" className="bg-black/40 hover:bg-black/60 text-gray-200 hover:text-white rounded-full backdrop-blur-md border border-white/10 gap-2 px-4 transition-all">
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </Button>
                    </Link>
                </div>
            </div>

            {/* --- RIGHT PANEL: SEARCH INTERFACE --- */}
            <div className="relative w-full md:w-[55%] lg:w-[60%] h-full bg-[#0f172a] flex flex-col border-l border-white/5 shadow-2xl">

                {/* Header & Search Bar */}
                <div className="p-6 border-b border-white/5 bg-[#0f172a]/95 backdrop-blur z-20 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Search className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-sm">Pencarian Jurnal</h2>
                                <p className="text-xs text-gray-400">Temukan referensi tanaman obat</p>
                            </div>
                        </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full">
                        <input
                            type="text"
                            className="w-full bg-[#1e293b] border border-white/10 hover:border-white/20 focus:border-emerald-500/50 rounded-xl pl-5 pr-14 py-4 text-sm text-white placeholder-gray-500 focus:ring-0 focus:outline-none transition-all shadow-lg focus:shadow-emerald-500/10"
                            placeholder="Cari jurnal (misal: 'Diabetes', 'Jahe', 'Inflamasi')..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <Button
                                size="icon"
                                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white w-10 h-10 flex items-center justify-center p-0 shadow-lg shadow-emerald-900/20 active:scale-95 transition-transform"
                                onClick={handleSearch}
                            >
                                <Search className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Results Area */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                            <p className="text-sm font-mono animate-pulse">Memuat jurnal...</p>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Book className="w-12 h-12 mb-4 opacity-20" />
                            <p>Tidak ada jurnal ditemukan.</p>
                        </div>
                    ) : (
                        <div className="">
                            <p className="text-xs text-gray-400 mb-4 font-mono">Menampilkan {displayedDocs.length} dari {documents.length} dokumen</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                                {displayedDocs.map((doc) => (
                                    <div key={doc.id} className="flex flex-col h-full bg-[#1e293b]/50 backdrop-blur-sm border border-white/5 hover:border-emerald-500/40 p-5 rounded-xl group transition-all duration-300 hover:bg-[#1e293b] hover:shadow-lg hover:shadow-emerald-900/10 relative overflow-hidden">
                                        {/* Decorative Icon Background */}
                                        <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                            <FileText className="w-32 h-32 transform rotate-12" />
                                        </div>

                                        <div className="flex items-start justify-between mb-3 relative z-10">
                                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                                <FileText className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-900/30 border border-emerald-500/20 px-2 py-1 rounded-md">
                                                {doc.year}
                                            </span>
                                        </div>

                                        <h4 className="text-sm font-bold text-gray-100 line-clamp-2 mb-2 leading-relaxed min-h-[3rem] group-hover:text-emerald-300 transition-colors" title={doc.title}>
                                            {doc.title}
                                        </h4>

                                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                            <UserIcon className="w-3.5 h-3.5 text-gray-600" />
                                            <span className="truncate max-w-[150px]">{doc.author || "Unknown Author"}</span>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-white/5 w-full relative z-10">
                                            <a
                                                href={doc.file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white/5 hover:bg-emerald-600/20 text-gray-300 hover:text-emerald-400 border border-transparent hover:border-emerald-500/30 text-xs font-semibold tracking-wide transition-all group-hover:translate-y-0"
                                            >
                                                Review Document <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 h-8 px-3"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                                    </Button>
                                    <span className="text-xs text-gray-500 font-mono">
                                        Page <span className="text-emerald-400">{page}</span> of {totalPages}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 h-8 px-3"
                                    >
                                        Next <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
