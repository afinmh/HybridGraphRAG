"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Leaf, Search } from "lucide-react";
import Link from "next/link";

export function CTA() {
  return (
    <section className="py-32 px-6 sm:px-8 lg:px-12 relative overflow-hidden bg-gradient-to-b from-gray-50/50 via-white to-gray-50/50 dark:from-gray-900/30 dark:via-gray-950 dark:to-gray-900/30">
      {/* Elegant Decorative Background */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-green-400/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/3 w-[600px] h-[600px] bg-emerald-400/5 rounded-full blur-3xl"></div>

      <div className="max-w-6xl mx-auto text-center relative z-10">
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 border-0 shadow-2xl shadow-green-500/25">
          {/* Decorative overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4djZoLTZ2LTZoNnptLTEyIDEydjZoLTZ2LTZoNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50"></div>
          
          <CardContent className="p-12 md:p-20 relative z-10">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-md rounded-3xl mb-10 animate-float shadow-xl">
              <Leaf className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 tracking-tight leading-tight">
              Siap Mengeksplorasi Dunia Herbal?
            </h2>
            <p className="text-lg md:text-xl lg:text-2xl text-white/95 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              Mulai perjalanan Anda dalam memahami khasiat tanaman herbal Indonesia
              dengan teknologi AI terdepan
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-green-700 hover:bg-green-50 hover:text-green-800 text-base md:text-lg px-10 py-7 rounded-2xl hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl font-medium"
                asChild
              >
                <Link href="/query" className="flex items-center">
                  <Search className="mr-2 h-5 w-5" />
                  Cari Informasi Herbal
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white/80 text-white hover:bg-white/10 hover:border-white text-base md:text-lg px-10 py-7 rounded-2xl hover:scale-105 transition-all duration-300 backdrop-blur-sm font-medium"
                asChild
              >
                <Link href="/upload" className="flex items-center">
                  Upload Jurnal
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
