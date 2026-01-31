"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot, Maximize2, GripHorizontal, Sparkles, Trash2, ChevronDown, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useDragControls, useMotionValue, useTransform, animate } from "framer-motion";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import Link from "next/link";

interface Source {
    title: string;
    author: string;
    year: string;
    similarity: number;
    text: string;
    file_url?: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
    originalQuery?: string;
    fullResponse?: any;
}

const ChatMessage = ({ msg, language }: { msg: Message, language: 'id' | 'en' }) => {
    const [showSources, setShowSources] = useState(false);

    const handleViewDetail = () => {
        if (msg.fullResponse) {
            localStorage.setItem('latest_query_detail', JSON.stringify(msg.fullResponse));
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm backdrop-blur-sm border ${msg.role === 'user'
                ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-50 rounded-tr-none'
                : 'bg-white/5 border-white/10 text-gray-200 rounded-tl-none'
                }`}>
                <div className="prose prose-sm prose-invert max-w-none leading-relaxed">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>

                {/* Sources Section */}
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 border-t border-white/10 pt-2">
                        <button
                            onClick={() => setShowSources(!showSources)}
                            className="flex items-center gap-2 text-[10px] sm:text-xs text-emerald-400 font-mono hover:text-emerald-300 transition-colors bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20"
                        >
                            <BookOpen className="w-3 h-3" />
                            {language === 'en' ? 'See Sources' : 'Lihat Sumber'}
                            <ChevronDown className={`w-3 h-3 transition-transform ${showSources ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showSources && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="space-y-3 mt-3 pb-1">
                                        {msg.sources.map((source, idx) => (
                                            <div key={idx} className="bg-black/20 rounded-lg p-3 border border-white/5 text-[10px] sm:text-xs">
                                                <div className="flex gap-2 mb-1">
                                                    {source.file_url ? (
                                                        <a
                                                            href={`${source.file_url}#search="${encodeURIComponent(source.text.substring(0, 50))}"`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-bold text-emerald-300 truncate flex-1 min-w-0 hover:underline hover:text-emerald-200 flex items-center gap-1 group/link"
                                                            title="Buka Jurnal (Open Journal)"
                                                        >
                                                            <span>{idx + 1}. {source.title}</span>
                                                            <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-70 group-hover/link:opacity-100" />
                                                        </a>
                                                    ) : (
                                                        <span className="font-bold text-emerald-300 truncate flex-1 min-w-0">{idx + 1}. {source.title}</span>
                                                    )}
                                                </div>
                                                <div className="text-gray-400 mb-2 font-mono">
                                                    Penulis: <span className="text-gray-300">{source.author}</span> |
                                                    Tahun: <span className="text-gray-300">{source.year}</span> |
                                                    Similarity: <span className="text-emerald-500">{source.similarity.toFixed(4)}</span>
                                                </div>
                                                <div className="text-gray-300 italic pl-2 border-l-2 border-emerald-500/30 line-clamp-3">
                                                    "{source.text.substring(0, 150)}..."
                                                </div>
                                            </div>
                                        ))}

                                        {/* Detail Link (Moved Inside Sources) */}
                                        {msg.fullResponse && (
                                            <div className="mt-2 text-right">
                                                <Link
                                                    href="/analysis?mode=cached"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={handleViewDetail}
                                                    className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs text-emerald-400/80 hover:text-emerald-400 transition-colors font-mono tracking-wide py-1 px-2 hover:bg-emerald-500/10 rounded-lg group/btn"
                                                >
                                                    {language === 'en' ? 'FULL ANALYSIS' : 'ANALISIS LENGKAP'}
                                                    <Maximize2 className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}



                <span className="text-[10px] opacity-40 mt-1 block font-mono">
                    {new Date(Number(msg.id) || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </motion.div>
    );
};


export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [language, setLanguage] = useState<'id' | 'en'>('id');
    const scrollRef = useRef<HTMLDivElement>(null);

    // System Readiness State
    const [isSystemReady, setIsSystemReady] = useState(false);

    // Simulate Model Loading / Warming Up
    useEffect(() => {
        if (isOpen && !isSystemReady) {
            // Simulate a "download" or "warmup" delay
            const timer = setTimeout(() => {
                setIsSystemReady(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Window Size State
    const [size, setSize] = useState({ width: 380, height: 500 });
    const isResizing = useRef(false);
    const [isResizingState, setIsResizingState] = useState(false);

    // Drag State
    const isDraggingRef = useRef(false);

    // Alignment State
    const [alignment, setAlignment] = useState<'left' | 'right'>('right');

    const y = useMotionValue(0);
    const x = useMotionValue(0);

    // Load History & Language
    useEffect(() => {
        const savedMessages = localStorage.getItem('herbal-chat-history');
        const savedLang = localStorage.getItem('herbal-chat-lang') as 'id' | 'en';

        if (savedLang) setLanguage(savedLang);

        if (savedMessages) {
            setMessages(JSON.parse(savedMessages));
        } else {
            // Initial Greeting
            setMessages([{
                id: '1',
                role: 'assistant',
                content: savedLang === 'en'
                    ? 'Hello! I am **AI Herbal**. Ready to help you explore the world of medicinal plants.'
                    : 'Halo! Saya **AI Herbal**. Siap membantu Anda menjelajahi dunia tanaman obat.'
            }]);
        }
    }, []);

    // Save History
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('herbal-chat-history', JSON.stringify(messages));
        }
    }, [messages]);

    // Save Language
    useEffect(() => {
        localStorage.setItem('herbal-chat-lang', language);
    }, [language]);

    const handleClearHistory = () => {
        const initialMsg: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: language === 'en'
                ? 'History cleared. How can I help you now?'
                : 'Riwayat dihapus. Ada yang bisa saya bantu?'
        };
        setMessages([initialMsg]);
        localStorage.removeItem('herbal-chat-history');
        localStorage.removeItem('latest_query_detail');
    };

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'id' ? 'en' : 'id');
    };


    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleDragStart = () => {
        isDraggingRef.current = true;
    };

    const handleDragEnd = (event: any, info: any) => {
        // Snap to Y = 0 (bottom)
        animate(y, 0, { type: "spring", stiffness: 300, damping: 20 });

        // Check horizontal alignment based on the ANCHOR position, not the mouse position.
        // Anchor is initially at bottom-6 right-6.
        // right-6 = 24px. w-16 = 64px. Center is approx 56px from right edge.
        const screenWidth = window.innerWidth;
        const initialAnchorX = screenWidth - 56;
        const currentAnchorX = initialAnchorX + x.get();

        if (currentAnchorX < screenWidth / 2) {
            setAlignment('left');
        } else {
            setAlignment('right');
        }

        // Delay resetting drag state so onClick can ignore the event
        setTimeout(() => {
            isDraggingRef.current = false;
        }, 150);
    };

    const handleResize = (e: any, direction: 'x' | 'y') => {
        e.preventDefault();
        e.stopPropagation();
        isResizing.current = true;
        setIsResizingState(true);

        const startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
        const startY = e.type.includes('mouse') ? e.pageY : e.touches[0].pageY;
        const startWidth = size.width;
        const startHeight = size.height;

        const onMove = (moveEvent: any) => {
            if (!isResizing.current) return;
            const currentX = moveEvent.type.includes('mouse') ? moveEvent.pageX : moveEvent.touches[0].pageX;
            const currentY = moveEvent.type.includes('mouse') ? moveEvent.pageY : moveEvent.touches[0].pageY;

            if (direction === 'x') {
                const diff = (alignment === 'right') ? (startX - currentX) : (currentX - startX);
                setSize(prev => ({ ...prev, width: Math.max(300, Math.min(600, startWidth + diff)) }));
            } else {
                const diff = startY - currentY;
                setSize(prev => ({ ...prev, height: Math.max(400, Math.min(800, startHeight + diff)) }));
            }
        };

        const onUp = () => {
            isResizing.current = false;
            setIsResizingState(false);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onUp);
            document.body.style.userSelect = '';
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
        document.body.style.userSelect = 'none';
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: userMsg.content, topK: 5, language }),
            });

            if (!response.ok) throw new Error("Failed to fetch");

            const data = await response.json();

            // Process sources
            let sources: Source[] = [];
            if (data.vectorResults && Array.isArray(data.vectorResults)) {
                const uniqueSources = new Map<string, Source>();

                data.vectorResults.forEach((res: any) => {
                    if (res.journal && res.journal.title) {
                        const existing = uniqueSources.get(res.journal.title);
                        if (!existing || res.similarity > existing.similarity) {
                            uniqueSources.set(res.journal.title, {
                                title: res.journal.title,
                                author: res.journal.author,
                                year: res.journal.year,
                                similarity: res.similarity,
                                text: res.text,
                                file_url: res.journal.file_url
                            });
                        }
                    }
                });
                sources = Array.from(uniqueSources.values());
            }

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.answer || "Maaf, saya tidak menemukan jawaban untuk itu.",
                sources: sources,
                originalQuery: userMsg.content,
                fullResponse: data
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Maaf, terjadi kesalahan saat memproses pertanyaan Anda."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const BUTTON_SIZE = 64; // w-16 = 4rem = 64px

    return (
        <motion.div
            drag={!isResizingState} // Disable drag when resizing
            dragMomentum={false}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={{ x, y }}
            // Always anchored right-6 bottom-6. We manage expansion via inner positioning.
            className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto"
        >
            {/*
               Wrapper Logic:
               - The Wrapper itself simulates the 'Button' size (approx) so dragging feels centered on the button?
               - Actually, if we want the window to expand "Out", we can let the wrapper be 0x0 size visually?
               - No, let's keep it simple. The wrapper is the anchor point.
            */}

            {/* Content Container: Relative to allow absolute children */}
            <div className="relative w-16 h-16">

                {/* Chat Window */}
                <AnimatePresence mode="wait">
                    {isOpen && (
                        <motion.div
                            key="chat-window"
                            initial={{
                                opacity: 0,
                                scale: 0.5,
                                // Origin depends on alignment
                                originX: alignment === 'left' ? 0 : 1,
                                originY: 1, // Bottom
                                x: alignment === 'right' ? -(size.width - BUTTON_SIZE) : 0
                            }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                x: alignment === 'right' ? -(size.width - BUTTON_SIZE) : 0
                            }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{
                                // Use instant transition for size when resizing to prevent lag/drift
                                duration: isResizingState ? 0 : 0.4,
                                type: isResizingState ? "tween" : "spring",
                                bounce: isResizingState ? 0 : 0.3
                            }}
                            style={{
                                width: size.width,
                                height: size.height,
                                // Position relative to the 16x16 anchor
                                position: 'absolute',
                                bottom: 0,
                                left: 0 // Always anchor left, use X to shift if needed
                            }}
                            className="bg-black/90 backdrop-blur-xl rounded-[2rem] border border-emerald-500/30 shadow-[0_0_50px_-10px_rgba(16,185,129,0.4)] flex flex-col overflow-hidden ring-1 ring-white/10"
                            onPointerDown={(e) => e.stopPropagation()} // Allow interacting with window without dragging the whole widget instantly?
                        // Actually we want drag on header, so maybe stop propagation on content/input?
                        // If we stop propagation here, you can't drag by grabbing the window body.
                        // User said "move anywhere", so usually grabbing the window title is best.
                        >
                            {/* Resize Handles */}

                            {/* TOP Handle (Resizes Height) */}
                            <div
                                className="absolute top-0 left-4 right-4 h-3 cursor-ns-resize z-50 flex justify-center items-start group/handle"
                                onMouseDown={(e) => handleResize(e, 'y')}
                                onTouchStart={(e) => handleResize(e, 'y')}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                {/* Visual Indicator for Handle */}
                                <div className="w-12 h-1 bg-white/20 rounded-full mt-1 group-hover/handle:bg-emerald-500/50 transition-colors" />
                            </div>

                            {/* SIDE Handle (Resizes Width) */}
                            <div
                                className={`absolute top-4 bottom-4 w-3 cursor-ew-resize z-50 flex items-center justify-center group/handle ${alignment === 'right' ? 'left-0' : 'right-0'}`}
                                onMouseDown={(e) => handleResize(e, 'x')}
                                onTouchStart={(e) => handleResize(e, 'x')}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                {/* Visual Indicator */}
                                <div className="h-12 w-1 bg-white/20 rounded-full group-hover/handle:bg-emerald-500/50 transition-colors" />
                            </div>

                            {/* Corner Handle (Optional: Keep it invisible for ease of use?) 
                                User said "Jangan di pojok". So we REMOVE it.
                            */}

                            {/* Futuristic Grid Background */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />



                            {/* Header */}
                            <div className="relative px-6 py-4 border-b border-white/10 bg-white/5 flex justify-between items-center backdrop-blur-md cursor-move">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Image
                                            src="/logo.png"
                                            alt="Herlist Logo"
                                            width={24}
                                            height={24}
                                            className="w-6 h-6 object-contain"
                                        />
                                        <span className={`absolute top-0 right-0 w-1.5 h-1.5 rounded-full animate-ping ${isSystemReady ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                                        <span className={`absolute top-0 right-0 w-1.5 h-1.5 rounded-full ${isSystemReady ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-white tracking-wide font-mono">HERLIST</h3>
                                        <p className={`text-[10px] font-mono tracking-wider ${isSystemReady ? 'text-emerald-400/80' : 'text-yellow-400/80 animate-pulse'}`}>
                                            {isSystemReady ? 'SYSTEM ONLINE' : 'WARMING UP...'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={toggleLanguage} className="text-gray-400 hover:text-emerald-400 hover:bg-white/5 rounded-lg w-8 h-8" title="Switch Language">
                                        <div className="text-[10px] font-bold font-mono border border-current rounded px-1">
                                            {language.toUpperCase()}
                                        </div>
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={handleClearHistory} className="text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg w-8 h-8" title="Clear History">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full w-8 h-8 ml-2"
                                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div
                                className="relative flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar transition-all cursor-auto"
                                ref={scrollRef}
                                onPointerDown={(e) => e.stopPropagation()} // Allow text selection / scrolling without drag
                            >
                                {messages.map((msg) => (
                                    <ChatMessage key={msg.id} msg={msg} language={language} />
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 rounded-tl-none flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                                            <span className="text-xs text-emerald-400/70 font-mono animate-pulse">ANALYZING...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input */}
                            <div
                                className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-md cursor-default"
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <form onSubmit={handleSubmit} className="flex gap-2 relative items-end">
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        disabled={!isSystemReady || isLoading}
                                        placeholder={!isSystemReady ? "INITIALIZING SYSTEMS..." : (language === 'en' ? "Type your question..." : "Ketik pertanyaan anda...")}
                                        className={`flex-1 px-4 h-12 rounded-xl border border-white/10 bg-black/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-sm text-white font-mono transition-all ${!isSystemReady ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                    <Button
                                        type="submit"
                                        size="icon"
                                        disabled={!isSystemReady || isLoading || !input.trim()}
                                        className={`bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-12 w-12 shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)] transition-all active:scale-95 ${!isSystemReady ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                                    >
                                        <Send className="w-5 h-5" />
                                    </Button>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Launcher Button */}
                <AnimatePresence mode="wait">
                    {!isOpen && (
                        <motion.button
                            key="launcher"
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 90 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                if (!isDraggingRef.current) setIsOpen(true);
                            }}
                            className="absolute inset-0 w-16 h-16 rounded-full flex items-center justify-center cursor-move"
                        >
                            <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-40 animate-pulse" />
                            <div className="relative w-full h-full bg-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-full flex items-center justify-center shadow-2xl ring-1 ring-white/10 overflow-hidden">
                                <MessageCircle className="w-7 h-7 text-emerald-400" />
                            </div>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
