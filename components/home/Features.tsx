"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Search, Network, FileText, Brain, Zap, Shield, Sparkles } from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";

const features = [
  {
    icon: Search,
    title: "AI-Search",
    description: "Sistem pencarian berbasis AI yang memahami konteks pertanyaan, bukan sekadar mencari kata kunci untuk menghasilkan jawaban.",
    color: "text-blue-500",
    bg: "bg-blue-500",
    lightBg: "bg-blue-50",
    borderColor: "border-blue-200 dark:border-blue-800",
    tags: ["Context Aware", "Deep Understanding"],
    image: "/home/search.webp"
  },
  {
    icon: Network,
    title: "Graph Database",
    description: "Memetakan ribuan relasi antara tanaman, senyawa, dan penyakit dalam struktur graf visual untuk pemahaman yang lebih mendalam.",
    color: "text-purple-500",
    bg: "bg-purple-500",
    lightBg: "bg-purple-50",
    borderColor: "border-purple-200 dark:border-purple-800",
    tags: ["Visual Relations", "Complex Mapping"],
    image: "/home/graph.webp"
  },
  {
    icon: Brain,
    title: "Natural Language",
    description: "Berinteraksi dengan sistem menggunakan bahasa sehari-hari yang santai, selayaknya berkonsultasi dengan ahli herbal.",
    color: "text-emerald-500",
    bg: "bg-emerald-500",
    lightBg: "bg-emerald-50",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    tags: ["Conversational", "Human-like"],
    image: "/home/nlp.webp"
  },
  {
    icon: FileText,
    title: "Verified Knowledge",
    description: "Setiap informasi diambil dari jurnal ilmiah terakreditasi dan divalidasi berlapis untuk mencegah misinformasi.",
    color: "text-amber-500",
    bg: "bg-amber-500",
    lightBg: "bg-amber-50",
    borderColor: "border-amber-200 dark:border-amber-800",
    tags: ["Trusted Sources", "Peer-Reviewed"],
    image: "/home/knowledge.webp"
  },
  {
    icon: Zap,
    title: "Hybrid Engine",
    description: "Menggabungkan kecepatan Vector Search dengan kedalaman Knowledge Graph untuk jawaban yang akurat dan relevan.",
    color: "text-blue-500", // Reusing Blue
    bg: "bg-blue-500",
    lightBg: "bg-blue-50",
    borderColor: "border-blue-200 dark:border-blue-800",
    tags: ["Fast Retrieval", "Deep Context"],
    image: "/home/engine.webp"
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Desain privasi-pertama memastikan data kesehatan Anda tetap aman dan tidak pernah dibagikan ke pihak ketiga.",
    color: "text-purple-500", // Reusing Purple
    bg: "bg-purple-500",
    lightBg: "bg-purple-50",
    borderColor: "border-purple-200 dark:border-purple-800",
    tags: ["Encryption", "Privacy-First"],
    image: "/home/security.webp"
  },
];

export function Features() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 1.5, ease: "easeOut" as const } },
  };

  // Auto-rotate every 7 seconds, paused on hover
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % features.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isPaused, activeIdx]);

  return (
    <section
      className="relative py-12 lg:py-20 overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url("/home/feature2.webp")' }}
      ref={containerRef}
    >
      {/* Lapisan gradient bawah gelap */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent" />

      <motion.div
        className="container px-4 md:px-6 mx-auto relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center h-full min-h-[500px]">

          {/* LEFT SIDE: The Card Stack */}
          <motion.div variants={itemVariants} className="relative w-full h-[400px] flex items-center justify-center order-2 lg:order-1">
            <div
              className="relative w-[320px] h-[420px]"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <AnimatePresence mode="popLayout">
                {features.map((feature, index) => {
                  // Only render the active, next, and previous for performance/logic if needed,
                  // but for the "Stack" look, we render based on logic below.
                  // Actually, let's just render the current one and the next 2 lookalikes for the "Stack" effect.

                  // Calculate visual position relative to active
                  const offset = (index - activeIdx + features.length) % features.length;

                  // We only care about the first 3 cards in the stack visually
                  if (offset > 2 && offset !== features.length - 1) return null;

                  const isActive = offset === 0;
                  const isNext = offset === 1;
                  const isNext2 = offset === 2;
                  const isLast = offset === features.length - 1; // Used for exit animation direction if we want reverse

                  return (
                    <motion.div
                      key={feature.title}
                      className={`absolute inset-0 rounded-[2.5rem] bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border ${feature.borderColor} shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none flex flex-col items-center justify-center text-center gap-6 overflow-hidden`}
                      initial={{ scale: 0.9, opacity: 0, y: 40, x: 40, zIndex: 0 }}
                      animate={{
                        scale: isActive ? 1 : isNext ? 0.95 : 0.9,
                        opacity: isActive ? 1 : isNext ? 0.6 : 0.4,
                        y: isActive ? 0 : isNext ? 15 : 30, // Reduced vertical gap
                        x: isActive ? 0 : isNext ? 15 : 30, // Reduced horizontal gap
                        rotate: isActive ? 0 : isNext ? 4 : 8, // Reduced rotation for subtlety
                        zIndex: isActive ? 30 : isNext ? 20 : 10,
                      }}
                      exit={{ scale: 1.05, opacity: 0, x: -50, rotate: -5, zIndex: 40 }} // Smoother exit
                      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }} // "Ease Out Expo"ish - very smooth for UI
                    >
                      {/* Background Image & Overlay */}
                      <div className="absolute inset-0 z-0">
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-110"
                          style={{ backgroundImage: `url("${feature.image}")` }}
                        />
                        <div className="absolute inset-0 bg-black/70 z-10" />
                      </div>

                      {/* Card Content */}
                      <div className="flex flex-col items-center gap-6 z-20 w-full relative px-8">

                        {/* Premium Icon Container */}
                        <div className="relative group cursor-pointer">
                          <div className={`absolute inset-0 ${feature.bg} rounded-[2rem] opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-500`} />
                          <div className={`w-24 h-24 rounded-[2rem] bg-black/40 backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-center relative z-10 group-hover:scale-105 transition-transform duration-300`}>
                            <feature.icon className={`w-10 h-10 ${feature.color} drop-shadow-sm`} />

                            {isActive && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                                className="absolute -top-3 -right-3 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg border border-gray-100 dark:border-gray-700 z-20"
                              >
                                <Sparkles className={`w-4 h-4 ${feature.color}`} />
                              </motion.div>
                            )}
                          </div>
                        </div>

                        <div className={`space-y-4 text-center transition-all duration-300 ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                          <h3 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                            {feature.title}
                          </h3>

                          {/* Tags */}
                          <div className="flex flex-col items-center gap-2 w-full">
                            {feature.tags?.map((tag, tagIdx) => (
                              <span
                                key={tagIdx}
                                className={`text-[11px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-sm ring-1 ring-black/5`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Decorative Line */}
                      <div className={`absolute bottom-0 inset-x-0 h-1.5 ${feature.bg} opacity-20`} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* RIGHT SIDE: The Text Description that updates */}
          <motion.div variants={itemVariants} className="order-1 lg:order-2 space-y-8 lg:pl-12">
            <div>
              <Badge variant="secondary" className="mb-4 px-4 py-1.5 bg-white/80 dark:bg-white/10 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 shadow-sm backdrop-blur-sm cursor-default">
                <Sparkles className="w-3.5 h-3.5 mr-2 text-green-500 animate-pulse" />
                Core Capabilities
              </Badge>
              <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                Teknologi Pintar untuk <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-500">
                  Kesehatan Anda
                </span>
              </h2>
            </div>

            <div className="relative w-full">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={activeIdx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="relative"
                >
                  <h3 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${features[activeIdx].color}`}>
                    {features[activeIdx].title}
                  </h3>
                  <p className="text-xl text-gray-200 leading-relaxed">
                    {features[activeIdx].description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Manual Indicators */}
            <div className="flex gap-3 mt-8 relative z-10">
              {features.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIdx(idx)}
                  className={`transition-all duration-300 rounded-full ${activeIdx === idx ? `w-12 h-3 ${features[idx].bg}` : "w-3 h-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300"}`}
                  aria-label={`Go to feature ${idx + 1}`}
                />
              ))}
            </div>
          </motion.div>

        </div>
      </motion.div>
    </section>
  );
}
