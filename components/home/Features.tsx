"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Network, FileText, Brain, Zap, Shield } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "AI-Powered Search",
    description:
      "Sistem pencarian berbasis AI yang memahami konteks pertanyaan Anda dengan tingkat akurasi tinggi menggunakan vector similarity",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Network,
    title: "Graph Database",
    description:
      "Relasi antar tanaman herbal divisualisasikan dalam graph untuk pemahaman holistik dan koneksi yang mendalam",
    gradient: "from-emerald-500 to-green-500",
  },
  {
    icon: Brain,
    title: "Natural Language Processing",
    description:
      "Memahami pertanyaan dalam bahasa natural dan memberikan jawaban yang relevan dengan context yang tepat",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: FileText,
    title: "Knowledge Base",
    description:
      "Database komprehensif dari jurnal ilmiah dan penelitian terpercaya tentang tanaman herbal Indonesia",
    gradient: "from-emerald-500 to-green-500",
  },
  {
    icon: Zap,
    title: "Fast Response",
    description:
      "Sistem hybrid search yang menggabungkan vector dan graph untuk hasil pencarian yang cepat dan akurat",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Shield,
    title: "Reliable Sources",
    description:
      "Setiap informasi dilengkapi dengan sumber dari jurnal penelitian yang dapat diverifikasi kebenarannya",
    gradient: "from-emerald-500 to-green-500",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="py-32 px-6 sm:px-8 lg:px-12 bg-gray-50/50 dark:bg-gray-900/30"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <Badge
            variant="outline"
            className="mb-5 px-4 py-2 border-emerald-500/20 bg-gradient-to-r from-emerald-50/80 to-green-50/80 dark:from-emerald-950/40 dark:to-green-950/40 text-emerald-700 dark:text-emerald-300 font-medium"
          >
            Fitur Unggulan
          </Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-7 tracking-tight">
            Teknologi Terdepan
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed font-light">
            Kombinasi sempurna antara AI, Graph Database, dan pengetahuan herbal
            tradisional Indonesia
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="group relative overflow-hidden hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-500 border border-gray-200/60 dark:border-gray-800/60 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md hover:-translate-y-2 hover:border-green-500/30 dark:hover:border-green-500/30"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                ></div>
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`}
                ></div>
                <CardHeader className="space-y-5 p-8 relative z-10">
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-xl group-hover:shadow-green-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-300">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
