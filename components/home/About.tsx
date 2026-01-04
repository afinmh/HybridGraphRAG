"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, Sparkles, Leaf, BookOpen } from "lucide-react";

export function About() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      id="about"
      className="relative py-32 px-6 sm:px-8 lg:px-12 bg-white dark:bg-gray-950 overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-multiply">
        <div className="absolute -right-32 top-10 w-80 h-80 bg-emerald-200/40 dark:bg-emerald-500/10 blur-3xl rounded-full" />
        <div className="absolute -left-24 bottom-0 w-72 h-72 bg-green-100/60 dark:bg-green-500/10 blur-3xl rounded-full" />
      </div>
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center relative z-10">
          <div
            className={`transition-all duration-[1400ms] ease-[cubic-bezier(0.23,1,0.32,1)] transform
              ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}
            `}
          >
            <Badge
              variant="outline"
              className="mb-6 px-4 py-2 border-green-500/20 bg-green-50/80 dark:bg-green-950/40 text-green-700 dark:text-green-300 font-medium"
            >
              Tentang Sistem
            </Badge>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">
              Pengetahuan Herbal di Ujung Jari Anda
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-6 leading-relaxed font-light">
              SumberHerbal adalah sistem informasi berbasis AI yang dikembangkan
              untuk membantu masyarakat Indonesia dalam mengakses dan memahami
              informasi tentang tanaman herbal dengan lebih mudah dan akurat.
            </p>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed font-light">
              Dengan menggunakan teknologi{" "}
              <span className="font-semibold text-green-600 dark:text-green-400">
                Hybrid Graph RAG
              </span>{" "}
              (Retrieval-Augmented Generation), sistem ini mampu memberikan
              jawaban yang kontekstual dengan memanfaatkan hubungan antar
              tanaman, khasiat, dan penggunaannya.
            </p>

            <div className="space-y-6 mb-10">
              <div className="flex items-start space-x-4 group">
                <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                    Basis Data Komprehensif
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Dikumpulkan dari jurnal ilmiah dan penelitian terpercaya
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4 group">
                <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                    Pencarian Kontekstual
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Memahami maksud pertanyaan dan memberikan jawaban relevan
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4 group">
                <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                    Sumber Terverifikasi
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Setiap informasi dilengkapi dengan referensi jurnal penelitian
                  </p>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-xl shadow-green-500/25 hover:shadow-2xl hover:shadow-green-500/40 transition-all duration-300 hover:scale-105 text-base px-8 py-6 rounded-2xl font-medium"
              asChild
            >
              <a href="#technology">
                Pelajari Teknologi
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>

          <div
            className={`relative transition-all duration-[1400ms] ease-[cubic-bezier(0.23,1,0.32,1)] transform delay-150
              ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}
            `}
          >
            <div className="pointer-events-none absolute -inset-10 bg-gradient-to-br from-emerald-400/20 via-green-300/10 to-transparent blur-3xl" />
            <Card className="relative bg-gradient-to-br from-green-50/95 to-emerald-50/95 dark:from-green-950/60 dark:to-emerald-950/60 border-green-200/60 dark:border-green-800/60 h-[500px] shadow-2xl shadow-green-500/10 overflow-hidden backdrop-blur-xl">
              <CardContent className="p-8 h-full flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4 p-4 bg-white/65 dark:bg-gray-900/60 rounded-xl backdrop-blur-sm hover:scale-105 transition-transform duration-300">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Vector Search
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Semantic similarity matching
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 p-4 bg-white/65 dark:bg-gray-900/60 rounded-xl backdrop-blur-sm hover:scale-105 transition-transform duration-300">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
                      <Leaf className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Knowledge Graph
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Relationship mapping
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 p-4 bg-white/65 dark:bg-gray-900/60 rounded-xl backdrop-blur-sm hover:scale-105 transition-transform duration-300">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Answer Generation
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Context-aware responses
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center p-6 bg-white/65 dark:bg-gray-900/60 rounded-xl backdrop-blur-sm border border-green-200/40 dark:border-green-800/40">
                  <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-1 tracking-tight">
                    Hybrid RAG
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Vector + Graph Database
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Vector Search
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Knowledge Graph
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
