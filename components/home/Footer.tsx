"use client";

import { Badge } from "@/components/ui/badge";
import { Github, Mail, Linkedin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative pt-24 pb-8 overflow-hidden bg-gray-50/50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-green-200/20 via-emerald-200/20 to-teal-200/20 dark:from-green-900/10 dark:via-emerald-900/10 dark:to-teal-900/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        <div className="grid md:grid-cols-4 gap-12 lg:gap-16 mb-24">
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
                <span className="text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 dark:from-green-400 dark:via-emerald-400 dark:to-green-400 bg-clip-text text-transparent">
                  SumberHerbal
                </span>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">AI-Powered Herbal Intelligence</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed max-w-md text-base">
              Sistem informasi tanaman herbal berbasis AI yang menggabungkan
              teknologi Retrieval-Augmented Generation dengan Graph Database
              untuk Indonesia.
            </p>
            <div className="flex space-x-3">
              {[
                { icon: Github, href: "#" },
                { icon: Mail, href: "#" },
                { icon: Linkedin, href: "#" }
              ].map((social, idx) => (
                <a
                  key={idx}
                  href={social.href}
                  className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:border-green-200 dark:hover:border-green-800 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 transform hover:scale-105"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6 text-gray-900 dark:text-white">Navigasi</h4>
            <ul className="space-y-4">
              {[
                { label: "Beranda", href: "#home" },
                { label: "Fitur", href: "#features" },
                { label: "Tentang", href: "#about" },
                { label: "Teknologi", href: "#technology" },
                { label: "Cari Herbal", href: "/query" },
                { label: "Upload Jurnal", href: "/upload" }
              ].map((link, idx) => (
                <li key={idx}>
                  <Link
                    href={link.href}
                    className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors text-sm font-medium hover:translate-x-1 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6 text-gray-900 dark:text-white">
              Penelitian
            </h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6">
              Dikembangkan sebagai bagian dari penelitian tugas akhir tentang
              implementasi Hybrid Graph RAG untuk sistem informasi herbal.
            </p>
            <Badge
              variant="outline"
              className="border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
            >
              Academic Research 2026
            </Badge>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 dark:text-gray-500 text-sm text-center md:text-left">
              &copy; 2026 SumberHerbal. Dibuat untuk keperluan penelitian akademik.
            </p>
            <div className="flex space-x-6 text-sm text-gray-500 dark:text-gray-500">
              <Link href="#" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
