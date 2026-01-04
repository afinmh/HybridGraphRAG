"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Search, Network, Sparkles } from "lucide-react";

const technologies = [
  {
    icon: Brain,
    title: "Large Language Model",
    description:
      "Mistral AI untuk pemrosesan bahasa alami dan pemahaman query yang akurat",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Search,
    title: "Vector Database",
    description:
      "Supabase pgvector untuk penyimpanan dan pencarian embeddings dengan kecepatan tinggi",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Network,
    title: "Graph Database",
    description:
      "PostgreSQL dengan relasi kompleks untuk analisis koneksi antar entitas",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Sparkles,
    title: "Next.js & React",
    description:
      "Framework modern untuk interface responsif dan pengalaman pengguna optimal",
    gradient: "from-orange-500 to-red-500",
  },
];

export function Technology() {
  return (
    <section
      id="technology"
      className="py-32 px-6 sm:px-8 lg:px-12 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white relative overflow-hidden"
    >
      {/* Elegant Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-green-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-emerald-500 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-24">
          <Badge
            variant="outline"
            className="mb-6 px-4 py-2 border-green-400/20 bg-green-950/50 text-green-300 font-medium backdrop-blur-sm"
          >
            Stack Teknologi
          </Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-7 tracking-tight">
            Dibangun dengan Teknologi Modern
          </h2>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-light">
            Menggunakan stack teknologi terkini untuk performa optimal dan
            skalabilitas tinggi
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {technologies.map((tech, index) => {
            const Icon = tech.icon;
            return (
              <Card
                key={index}
                className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 hover:bg-gray-800/60 hover:border-gray-600/50 transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:shadow-green-500/10 group"
              >
                <CardHeader className="p-8">
                  <div
                    className={`w-18 h-18 bg-gradient-to-br ${tech.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-xl`}
                  >
                    <Icon className="w-9 h-9 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold mb-3 group-hover:text-green-400 transition-colors duration-300 tracking-tight text-white">
                    {tech.title}
                  </CardTitle>
                  <CardDescription className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300 leading-relaxed">
                    {tech.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Additional Tech Info */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 text-center">
          <div className="p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
            <div className="text-3xl font-bold text-green-400 mb-2">384D</div>
            <div className="text-gray-400">Vector Embeddings</div>
          </div>
          <div className="p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
            <div className="text-3xl font-bold text-emerald-400 mb-2">2-Hop</div>
            <div className="text-gray-400">Graph Traversal</div>
          </div>
          <div className="p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
            <div className="text-3xl font-bold text-green-400 mb-2">&lt;2s</div>
            <div className="text-gray-400">Average Response</div>
          </div>
        </div>
      </div>
    </section>
  );
}
