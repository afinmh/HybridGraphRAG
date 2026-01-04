"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, Leaf, Search } from "lucide-react";
import { useEffect, useState } from "react";

export function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      id="home"
      className="relative w-full h-[100vh] overflow-hidden bg-white"
      style={{
        backgroundImage: 'url(/home/hero.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#fff',
        height: '100vh',
      }}
    >
      {/* Lapisan gradient bawah gelap */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Konten utama */}
      <div className="relative z-20 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
        <div className="grid md:grid-cols-2 gap-10 w-full items-center">
          {/* Kiri: Teks */}
          <div
            className={`space-y-6 transform transition-all duration-[1600ms] ease-[cubic-bezier(0.23,1,0.32,1)]
              ${mounted ? "opacity-100 translate-x-10" : "opacity-0 -translate-x-20"}
            `}
          >
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/40 text-emerald-100 text-xs font-medium shadow-sm backdrop-blur-sm">
              <Sparkles className="w-3 h-3 mr-1" />
              Asisten AI untuk rekomendasi herbal Anda
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Sumber Informasi
              <span className="block bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-200 bg-clip-text text-transparent">
                Tanaman Herbal
              </span>
            </h1>

            <p className="text-sm sm:text-base text-gray-200 max-w-xl">
              Tidak perlu lagi bingung membaca ribuan halaman riset. AI kami menggunakan metode Retrieval-Augmented Generation (RAG) untuk merangkum fakta khasiat, dosis, dan efek samping langsung dari jurnal ilmiah tepercaya.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                asChild
                className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white shadow-lg shadow-emerald-500/40 hover:shadow-emerald-400/60 transition-all duration-300 hover:scale-105 text-sm px-5 py-2 rounded-xl"
              >
                <a href="/query">
                  <Search className="w-4 h-4 mr-2" />
                  Mulai Cari Herbal
                </a>
              </Button>

              <Button
                variant="outline"
                asChild
                className="border-emerald-400/70 text-emerald-100 hover:bg-emerald-500/10 text-sm px-4 py-2 rounded-xl"
              >
                <a href="#about">
                  <Leaf className="w-4 h-4 mr-2" />
                  Pelajari cara kerja
                </a>
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 pt-4 text-xs sm:text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Jawaban berdasarkan jurnal ilmiah terverifikasi
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                Rekomendasi herbal personal sesuai kebutuhan Anda
              </div>
            </div>
          </div>

          {/* Kanan: Kartu highlight */}
          <div
            className={`hidden md:flex justify-end transform transition-all duration-[1600ms] ease-[cubic-bezier(0.23,1,0.32,1)] delay-300
              ${mounted ? "opacity-100 -translate-x-10" : "opacity-0 translate-x-5"}
            `}
          >
            <div className="relative w-full max-w-md">
              <div className="absolute -inset-10 bg-gradient-to-br from-emerald-400/30 via-green-300/10 to-transparent blur-3xl" />

              <div className="relative bg-white/80 backdrop-blur-xl border border-emerald-100 rounded-3xl shadow-xl shadow-emerald-100 p-5 space-y-4 animate-float">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-emerald-600">Jurnal terverifikasi</p>
                    <p className="text-lg font-semibold text-gray-900">+1500</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Real-time AI
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 space-y-1">
                    <p className="text-[11px] font-semibold text-emerald-700">Rekomendasi tanaman</p>
                    <p className="text-[11px] text-gray-600">Sesuaikan keluhan, kondisi, dan preferensi Anda.</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-white/90 p-3 space-y-1">
                    <p className="text-[11px] font-semibold text-emerald-700">Interaksi & dosis</p>
                    <p className="text-[11px] text-gray-600">Dapatkan informasi keamanan konsumsi herbal.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-white/80 p-3 flex items-center gap-3 text-[11px]">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Leaf className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-700">Mulai dengan satu pertanyaan</p>
                    <p className="text-gray-600">"Apa herbal yang cocok untuk keluhan saya?"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
