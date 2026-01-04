"use client";

import { Badge } from "@/components/ui/badge";
import { Github, Mail, Linkedin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white py-20 px-6 sm:px-8 lg:px-12 border-t border-gray-800/50">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-16 mb-16">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-4 mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl blur-lg"></div>
                <Image
                  src="/logo.png"
                  alt="SumberHerbal Logo"
                  width={48}
                  height={48}
                  className="w-12 h-12 relative"
                />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-green-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  SumberHerbal
                </span>
                <p className="text-xs font-medium text-gray-500">AI-Powered Herbal Intelligence</p>
              </div>
            </div>
            <p className="text-gray-400 mb-8 leading-relaxed max-w-md text-base">
              Sistem informasi tanaman herbal berbasis AI yang menggabungkan
              teknologi Retrieval-Augmented Generation dengan Graph Database
              untuk Indonesia.
            </p>
            <div className="flex space-x-3">
              <a
                href="#"
                className="w-12 h-12 bg-gray-800/50 hover:bg-gradient-to-br hover:from-green-600 hover:to-emerald-600 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-green-500/25 backdrop-blur-sm border border-gray-700/50 hover:border-green-500/50"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-12 h-12 bg-gray-800/50 hover:bg-gradient-to-br hover:from-green-600 hover:to-emerald-600 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-green-500/25 backdrop-blur-sm border border-gray-700/50 hover:border-green-500/50"
              >
                <Mail className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-12 h-12 bg-gray-800/50 hover:bg-gradient-to-br hover:from-green-600 hover:to-emerald-600 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-green-500/25 backdrop-blur-sm border border-gray-700/50 hover:border-green-500/50"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6 text-green-400">Navigasi</h4>
            <ul className="space-y-4">
              <li>
                <a
                  href="#home"
                  className="text-gray-400 hover:text-green-400 transition-colors text-base hover:translate-x-1 inline-block transition-transform"
                >
                  Beranda
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="text-gray-400 hover:text-green-400 transition-colors text-base hover:translate-x-1 inline-block transition-transform"
                >
                  Fitur
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  className="text-gray-400 hover:text-green-400 transition-colors text-base hover:translate-x-1 inline-block transition-transform"
                >
                  Tentang
                </a>
              </li>
              <li>
                <a
                  href="#technology"
                  className="text-gray-400 hover:text-green-400 transition-colors"
                >
                  Teknologi
                </a>
              </li>
              <li>
                <Link
                  href="/query"
                  className="text-gray-400 hover:text-green-400 transition-colors"
                >
                  Cari Herbal
                </Link>
              </li>
              <li>
                <Link
                  href="/upload"
                  className="text-gray-400 hover:text-green-400 transition-colors"
                >
                  Upload Jurnal
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4 text-green-400">
              Penelitian
            </h4>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Dikembangkan sebagai bagian dari penelitian tugas akhir tentang
              implementasi Hybrid Graph RAG untuk sistem informasi herbal.
            </p>
            <Badge
              variant="outline"
              className="border-green-700 text-green-400"
            >
              Academic Research 2025
            </Badge>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              &copy; 2025 SumberHerbal. Dibuat untuk keperluan penelitian
              akademik.
            </p>
            <div className="flex space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-green-400 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-green-400 transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
