"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Database, Share2, Sparkles, CheckCircle2, Network, Dna, ShieldCheck, Zap, MousePointerClick } from "lucide-react";
import Image from "next/image";
import { motion, useInView, AnimatePresence } from "framer-motion";

export function About() {
  const ref = useRef(null);
  const coreRef = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const isCoreInView = useInView(coreRef, { once: true, margin: "-50px" });
  const [isActivated, setIsActivated] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 1.5, ease: "easeOut" } },
  };

  const coreVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 1.5, ease: "easeOut" } },
  };

  // Variants for the features (entering from center)
  const sideFeatureVariants = {
    closed: { opacity: 0, scale: 0.8, filter: "blur(10px)", pointerEvents: "none" as const },
    open: { opacity: 1, scale: 1, filter: "blur(0px)", pointerEvents: "auto" as const, transition: { duration: 0.8, ease: "backOut" } }
  };

  return (
    <section id="about" className="relative py-24 lg:py-32 overflow-hidden bg-gray-50/50 dark:bg-gray-950">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-green-200/20 via-emerald-200/20 to-teal-200/20 dark:from-green-900/10 dark:via-emerald-900/10 dark:to-teal-900/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="container px-4 md:px-6 mx-auto relative z-10" ref={ref}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="flex flex-col items-center"
        >
          {/* Centered Header */}
          <div className="text-center max-w-3xl mb-16 lg:mb-24 space-y-6">
            <motion.div variants={itemVariants} className="flex justify-center">
              <Badge variant="secondary" className="px-4 py-1.5 bg-white/80 dark:bg-white/10 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 shadow-sm backdrop-blur-sm cursor-default">
                <Sparkles className="w-3.5 h-3.5 mr-2 text-green-500 animate-pulse" />
                The Core Technology
              </Badge>
            </motion.div>

            <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
              Bukan Sekadar Mitos, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500">
                Ini Fakta Berbasis Riset
              </span>
            </motion.h2>

            <motion.p variants={itemVariants} className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Klik inti sistem di bawah untuk melihat bagaimana ekosistem AI kami bekerja menghubungkan ratusan data medis secara realtime.
            </motion.p>
          </div>

          {/* 3-Column Interactive Layout */}
          <div className="grid lg:grid-cols-3 gap-8 w-full items-center relative min-h-[420px]">

            {/* Left Column: Features (Hidden Initially) */}
            <motion.div
              className="space-y-12 order-2 lg:order-1 relative z-10 lg:-translate-y-32"
              initial="closed"
              animate={isActivated ? "open" : "closed"}
              variants={{
                closed: { opacity: 0, x: 100 },
                open: { opacity: 1, x: 0, transition: { staggerChildren: 0.2, delayChildren: 0.3 } }
              }}
            >
              {[
                { title: "Sumber Pengetahuan", desc: "Terhubung langsung dengan puluhan jurnal ilmiah sebagai sumber rujukan dari setiap jawaban.", icon: Database, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
                { title: "Analisis Kontekstual", desc: "Memahami hubungan antara gejala, penyakit, dan senyawa aktif semua tanaman herbal.", icon: Network, color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20" }
              ].map((item, i) => (
                <motion.div variants={sideFeatureVariants} key={i} className="flex lg:flex-row flex-col lg:text-right text-center items-center lg:items-start gap-4 group">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-green-600 transition-colors">{item.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                  <div className={`flex-shrink-0 w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300 mx-auto lg:mx-0`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Center Column: The Interactive Core */}
            <div ref={coreRef} className="relative h-[320px] lg:h-[420px] w-full flex items-center justify-center order-1 lg:order-2 z-20">
              <motion.div
                variants={coreVariants}
                initial="hidden"
                animate={isCoreInView ? "visible" : "hidden"}
                className="w-full h-full flex items-center justify-center"
              >
                {/* Clickable Area */}
                <motion.div
                  className="relative cursor-pointer group"
                  onClick={() => setIsActivated(!isActivated)}
                  animate={{
                    scale: isActivated ? 1 : 1.5,
                    rotate: isActivated ? 0 : 0
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  whileHover={{ scale: isActivated ? 1.05 : 1.55 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {/* Shockwave Effect when activated */}
                  <AnimatePresence>
                    {isActivated && (
                      <motion.div
                        initial={{ opacity: 0.5, scale: 1 }}
                        animate={{ opacity: 0, scale: 2 }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 rounded-full bg-green-400/30 dark:bg-green-500/20 z-0"
                      />
                    )}
                  </AnimatePresence>

                  {/* Rotating Rings (Scale with parent) */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px]">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: isActivated ? 10 : 30, repeat: Infinity, ease: "linear" }}
                      className={`w-full h-full border border-dashed rounded-full transition-colors duration-500 ${isActivated ? "border-green-400/60 dark:border-green-600/60" : "border-green-300/40 dark:border-green-700/30"}`}
                    />
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px]">
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: isActivated ? 15 : 25, repeat: Infinity, ease: "linear" }}
                      className={`w-full h-full border-[1.5px] rounded-full transition-colors duration-500 ${isActivated ? "border-emerald-500/60 dark:border-emerald-400/50" : "border-emerald-300/50 dark:border-emerald-800/40"}`}
                    />
                  </div>

                  {/* The Core Orb */}
                  <div className="relative w-32 h-32 md:w-40 md:h-40 bg-gradient-to-b from-white to-green-50 dark:from-gray-800 dark:to-gray-900 rounded-full shadow-2xl border-4 border-white dark:border-gray-800 flex items-center justify-center overflow-hidden z-10">
                    <div className={`absolute inset-0 bg-emerald-500/20 rounded-full blur-xl transition-all duration-500 ${isActivated ? "opacity-100 scale-150" : "opacity-50 animate-pulse"}`} />

                    <motion.div
                      animate={{ rotate: isActivated ? 360 : 0 }}
                      transition={{ duration: 0.8, ease: "backOut" }}
                      className="relative w-16 h-16 md:w-20 md:h-20"
                    >
                      <Image
                        src="/home/thyme.png"
                        alt="Inactive Mint"
                        fill
                        className={`object-contain transition-opacity duration-300 ${isActivated ? "opacity-0" : "opacity-100"}`}
                      />
                      <Image
                        src="/home/mortars.png"
                        alt="Active Mint"
                        fill
                        className={`object-contain transition-opacity duration-300 ${isActivated ? "opacity-100" : "opacity-0"}`}
                      />
                    </motion.div>

                    {/* Inner particles */}
                    <motion.div
                      animate={{ rotate: 360, scale: isActivated ? [1, 1.1, 1] : 1 }}
                      transition={{ rotate: { duration: 10, repeat: Infinity, ease: "linear" }, scale: { duration: 2, repeat: Infinity } }}
                      className="absolute inset-[10px] border border-dashed border-green-200 dark:border-gray-700 rounded-full opacity-50"
                    />
                  </div>

                  {/* Status Label */}
                  <motion.div
                    className={`absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center justify-center px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap shadow-lg backdrop-blur-md border ${isActivated ? "bg-green-100/90 border-green-200 text-green-700 dark:bg-green-900/60 dark:border-green-800 dark:text-green-300 scale-110" : "bg-white/80 border-gray-200 text-gray-500 dark:bg-gray-800/80 dark:border-gray-700 dark:text-gray-400"}`}
                  >
                    {isActivated ? "System Active" : "Click Me!"}
                  </motion.div>
                </motion.div>

                {/* Connecting lines (Only Visible when Activated) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 600 600">
                  <motion.path
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={isActivated ? { pathLength: 1, opacity: 0.2 } : { pathLength: 0, opacity: 0 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    d="M100 150 Q 300 300 150 450"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <motion.path
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={isActivated ? { pathLength: 1, opacity: 0.2 } : { pathLength: 0, opacity: 0 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    d="M500 150 Q 300 300 450 450"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </motion.div>
            </div>

            {/* Right Column: Features (Hidden Initially) */}
            <motion.div
              className="space-y-12 order-3 relative z-10 lg:translate-y-32"
              initial="closed"
              animate={isActivated ? "open" : "closed"}
              variants={{
                closed: { opacity: 0, x: -100 },
                open: { opacity: 1, x: 0, transition: { staggerChildren: 0.2, delayChildren: 0.3 } }
              }}
            >
              {[
                { title: "Hindari Halusinasi", desc: "Jawaban yang dihasilkan selalu berdasarkan referensi yang ada, meminimalkan informasi yang salah.", icon: ShieldCheck, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
                { title: "Respons Cepat", desc: "Optimasi vektor dan graph memungkinkan pencarian informasi kompleks dalam hitungan detik.", icon: Zap, color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" }
              ].map((item, i) => (
                <motion.div variants={sideFeatureVariants} key={i} className="flex lg:flex-row flex-col text-center lg:text-left items-center lg:items-start gap-4 group">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300 mx-auto lg:mx-0`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-green-600 transition-colors">{item.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

          </div>



        </motion.div>
      </div>
    </section>
  );
}
