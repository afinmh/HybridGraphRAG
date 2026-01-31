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

interface Message {
    id: number;
    sender: 'bot' | 'user';
    text?: string;
    cards?: Journal[];
    isThinking?: boolean;
}

function JournalResults({ docs }: { docs: Journal[] }) {
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 6;
    const totalPages = Math.ceil(docs.length / ITEMS_PER_PAGE);

    const displayedDocs = docs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    if (docs.length === 0) return null;

    return (
        <div className="w-full mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-2">
                {displayedDocs.map((doc) => (
                    <div key={doc.id} className="flex flex-col h-full bg-[#1e293b]/80 backdrop-blur-sm border border-white/10 hover:border-emerald-500/40 p-5 rounded-xl group transition-all duration-300 hover:bg-[#1e293b] hover:shadow-lg hover:shadow-emerald-900/10 relative overflow-hidden">
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
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5 pr-2">
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
    );
}

export default function DocumentPage() {
    const [query, setQuery] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, sender: 'bot', text: "Selamat datang di Perpustakaan Digital Sumber Herbal!" }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto scroll to bottom only for new interactions (not initial load)
    useEffect(() => {
        if (scrollRef.current && messages.length > 2) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Initial Fetch
    const hasFetched = useRef(false);
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchInit = async () => {
            setIsTyping(true);
            try {
                const res = await fetch(`/api/documents`);
                const data = await res.json();
                const docs = data.documents || [];

                setIsTyping(false);
                if (docs.length > 0) {
                    setMessages(prev => [
                        ...prev,
                        { id: Date.now(), sender: 'bot', text: `Berikut adalah koleksi jurnal terbaru kami:`, cards: docs }
                    ]);
                }
            } catch (e) {
                setIsTyping(false);
            }
        };

        // Delay slightly for effect
        setTimeout(fetchInit, 1000);
    }, []);

    const handleSearch = async () => {
        if (!query.trim()) return;

        const userMsg: Message = { id: Date.now(), sender: 'user', text: query };
        setMessages(prev => [...prev, userMsg]);
        setQuery("");
        setIsTyping(true);

        // Simulate thinking delay
        setTimeout(async () => {
            try {
                // Fetch real data
                const params = new URLSearchParams({ q: userMsg.text || "" });
                const res = await fetch(`/api/documents?${params.toString()}`);
                const data = await res.json();
                const docs = data.documents || [];

                setIsTyping(false);

                if (docs.length > 0) {
                    setMessages(prev => [
                        ...prev,
                        { id: Date.now() + 1, sender: 'bot', text: `Berikut adalah ${docs.length} jurnal yang saya temukan untuk "${userMsg.text}":`, cards: docs }
                    ]);
                } else {
                    setMessages(prev => [
                        ...prev,
                        { id: Date.now() + 1, sender: 'bot', text: `Maaf, saya tidak menemukan jurnal terkait "${userMsg.text}". Coba kata kunci lain.` }
                    ]);
                }

            } catch (err) {
                setIsTyping(false);
                setMessages(prev => [
                    ...prev,
                    { id: Date.now() + 1, sender: 'bot', text: "Terjadi kesalahan sistem saat mengambil data." }
                ]);
            }
        }, 1500);
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
                    {/* We specify the model path relative to public */}
                    <Live2DViewer modelPath="/natori/runtime/natori_pro_t06.model3.json" />
                </div>

                {/* Navbar Overlay on Left */}
                <div className="absolute top-6 left-6 z-20">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md border border-white/10">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* --- RIGHT PANEL: CHAT INTERFACE --- */}
            <div className="relative w-full md:w-[55%] lg:w-[60%] h-full bg-[#0f172a] flex flex-col border-l border-white/5 shadow-2xl">

                {/* Header */}
                <div className="h-16 border-b border-white/5 bg-[#0f172a]/95 backdrop-blur flex items-center justify-between px-6 z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Book className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-sm">Assistant Pustaka</h2>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-xs text-emerald-500 font-medium">Online</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => window.location.reload()} className="text-gray-400 hover:text-white">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent custom-scrollbar" ref={scrollRef}>

                    <AnimatePresence initial={false}>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >

                                <div className="w-full space-y-4">
                                    {/* Text Bubble */}
                                    {msg.text && (
                                        <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-lg w-fit max-w-[85%] ${msg.sender === 'user'
                                            ? 'bg-emerald-600 text-white rounded-tr-sm ml-auto'
                                            : 'bg-[#1e293b] text-gray-200 border border-white/5 rounded-tl-sm'
                                            }`}>
                                            {msg.text}
                                        </div>
                                    )}

                                    {/* Results Cards with Pagination */}
                                    {msg.cards && <JournalResults docs={msg.cards} />}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isTyping && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                            <div className="w-8 h-8 rounded-full bg-emerald-900/40 border border-emerald-500/30 flex-shrink-0 mr-3 mt-1" />
                            <div className="bg-[#1e293b] border border-white/5 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1">
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-[#0f172a] border-t border-white/5">
                    <div className="relative max-w-4xl mx-auto">
                        <input
                            type="text"
                            className="w-full bg-[#1e293b] border border-white/10 hover:border-white/20 focus:border-emerald-500/50 rounded-full pl-6 pr-14 py-4 text-sm text-white placeholder-gray-500 focus:ring-0 focus:outline-none transition-all shadow-xl"
                            placeholder="Cari jurnal (misal: 'Dampak AI pada kesehatan')..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            disabled={isTyping}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <Button
                                size="icon"
                                className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 w-10 h-10 flex items-center justify-center p-0"
                                onClick={handleSearch}
                                disabled={!query.trim() || isTyping}
                            >
                                <Send className="w-4 h-4 ml-0.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
