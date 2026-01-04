"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${isScrolled
          ? 'bg-black/45 backdrop-blur-2xl border-b border-white/10 shadow-lg shadow-emerald-500/10'
          : 'bg-transparent border-b border-transparent shadow-none'}
      `}
      style={{ transitionProperty: 'background-color, border-color, box-shadow, backdrop-filter' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 w-full">
          {/* Kiri: Logo dan Judul */}
          <div className="flex items-center flex-1 min-w-0">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <Image
                  src="/logo.png"
                  alt="SumberHerbal Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10 relative"
                />
              </div>
              <div className="truncate">
                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-200 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  SumberHerbal
                </span>
                <p className="text-[10px] font-medium text-gray-200 -mt-1 tracking-wide truncate">
                  AI-Powered Herbal Intelligence
                </p>
              </div>
            </Link>
          </div>
          {/* Tengah: Menu */}
          <div className="hidden md:flex flex-1 justify-center items-center gap-2">
            <Button variant="ghost" asChild className="text-sm text-white/80 hover:text-emerald-300 hover:bg-white/5 transition-all duration-200 font-medium px-3 rounded-xl">
              <a href="#about">Tentang</a>
            </Button>
            <Button variant="ghost" asChild className="text-sm text-white/80 hover:text-emerald-300 hover:bg-white/5 transition-all duration-200 font-medium px-3 rounded-xl">
              <a href="#features">Fitur</a>
            </Button>
            <Button variant="ghost" asChild className="text-sm text-white/80 hover:text-emerald-300 hover:bg-white/5 transition-all duration-200 font-medium px-3 rounded-xl">
              <a href="#technology">Teknologi</a>
            </Button>
          </div>
          {/* Kanan: Tombol Cari Herbal */}
          <div className="flex flex-1 justify-end items-center">
            <Button
              asChild
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300 hover:scale-105 font-medium px-5 py-2 text-sm"
            >
              <Link href="/query">
                <Sparkles className="w-4 h-4 mr-2" />
                Cari Herbal
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
