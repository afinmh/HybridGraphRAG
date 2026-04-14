"use client";

import { useState } from "react";
import { Navbar } from "@/components/home/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, RefreshCw, Layers, Scissors, Type, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PreprocessPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("metadata");
  const [fileName, setFileName] = useState<string>("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/prepross", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error preprocessing file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-gray-100 selection:bg-emerald-500/30 font-sans pb-20 overflow-x-hidden">
      {/* Background - Copied from Summary */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="container mx-auto px-8 md:px-12 py-12 md:py-16 max-w-7xl relative z-10 space-y-8">
        
        {/* Header - Matching Summary exactly */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button variant="ghost" size="sm" className="bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 rounded-full gap-2">
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </Button>
                </Link>
                <div className="h-6 w-px bg-white/10" />
                <h1 className="text-lg font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
                    Preprocessing
                </h1>
            </div>
        </div>

        {/* Upload Section */}
        <div className={`transition-all duration-500 ${result ? "max-w-4xl mx-auto" : ""}`}>
          <Card className="bg-black/40 border border-white/10 rounded-2xl backdrop-blur-sm shadow-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className={`m-1 ${result ? "p-4" : "p-2"}`}>
                {!loading && !result && (
                  <div className="flex items-center justify-center w-full">
                    <label 
                      htmlFor="dropzone-file" 
                      className="flex flex-col items-center justify-center w-full h-64 border-2 border-white/10 border-dashed rounded-xl cursor-pointer bg-[#0A0A0A] hover:bg-[#111] hover:border-emerald-500/50 transition-all duration-300 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 relative z-10">
                        <div className="w-16 h-16 rounded-full bg-white/5 group-hover:bg-emerald-500/20 flex items-center justify-center mb-4 transition-colors">
                          <Upload className="w-8 h-8 text-gray-400 group-hover:text-emerald-400 transition-colors" />
                        </div>
                        <p className="mb-2 text-lg text-gray-300 font-medium">
                          <span className="text-emerald-400 font-bold">Pilih dokumen</span> atau tarik ke sini
                        </p>
                        <p className="text-sm text-gray-500">Maksimal ukuran file PDF 10MB</p>
                      </div>
                      <input id="dropzone-file" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={loading} />
                    </label>
                  </div>
                )}

                {loading && (
                  <div className="flex flex-col items-center justify-center h-32 space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full blur-xl bg-emerald-500/30 animate-pulse"></div>
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin relative z-10" />
                    </div>
                    <div className="text-center mt-2">
                      <h3 className="text-sm font-bold text-gray-200">Menjalankan Pipeline AI...</h3>
                    </div>
                  </div>
                )}

                {result && !loading && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-2">
                    <div className="flex items-center space-x-4 w-full sm:w-auto">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-emerald-400 mb-1">Proses Selesai</h3>
                        <p className="text-gray-400 font-mono text-xs truncate bg-white/5 px-3 py-1.5 rounded-md border border-white/10 max-w-[200px] sm:max-w-[300px]">{fileName}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-colors w-full sm:w-auto rounded-xl" onClick={() => setResult(null)}>
                      <RefreshCw className="w-3 h-3 mr-2" /> Upload Dokumen Lain
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 mt-12">
            
            {/* Custom Interactive Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-4 scrollbar-hide">
              {[
                { id: 'metadata', label: 'Metadata & Pola', icon: <Layers className="w-4 h-4 mr-2"/> },
                { id: 'cleaning', label: 'Teks Cleaning', icon: <Type className="w-4 h-4 mr-2"/> },
                { id: 'chunks', label: 'Hasil Chunking', icon: <Scissors className="w-4 h-4 mr-2"/> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id 
                      ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-500" 
                      : "bg-slate-900/50 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB: METADATA */}
            {activeTab === 'metadata' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl">
                  <CardHeader className="border-b border-slate-800/60 pb-5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl text-slate-200 font-bold flex items-center">
                        <div className="w-2 h-6 bg-blue-500 rounded-full mr-3"></div>
                        Metadata Ekstraksi AI
                      </CardTitle>
                      <Badge className="bg-slate-800 text-slate-300 border-none">Mistral LLM</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="group">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Judul Jurnal</span>
                      <div className="text-slate-200 font-medium bg-slate-800/30 p-3 rounded-lg border border-slate-800/50 group-hover:border-slate-700 transition-colors">
                        {result.metadata.title}
                      </div>
                    </div>
                    <div className="group">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Penulis</span>
                      <div className="text-slate-300 bg-slate-800/30 p-3 rounded-lg border border-slate-800/50 group-hover:border-slate-700 transition-colors">
                        {result.metadata.authors}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tahun Publikasi</span>
                      <Badge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-mono">
                        {result.metadata.year}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl">
                  <CardHeader className="border-b border-slate-800/60 pb-5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl text-slate-200 font-bold flex items-center">
                        <div className="w-2 h-6 bg-emerald-500 rounded-full mr-3"></div>
                        Pola Teks Berulang
                      </CardTitle>
                      <Badge className="bg-slate-800 text-slate-300 border-none">Header & Footer</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-5">
                      {['header_even', 'footer_even', 'header_odd', 'footer_odd'].map((key) => {
                        const label = key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                        const value = result.metadata[key];
                        return (
                          <div key={key} className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</span>
                            <div className="bg-[#0f0f11] p-3 rounded-xl border border-slate-800 text-xs text-slate-400 min-h-[70px] uppercase font-mono flex items-center justify-center text-center shadow-inner">
                              {value ? value : <span className="opacity-40 italic">Tidak terdeteksi</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB: CLEANING */}
            {activeTab === 'cleaning' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[
                  { title: "Original Extract", color: "indigo", text: result.originalText },
                  { title: "Cleaned Text", color: "blue", text: result.cleanedText },
                  { title: "Normalized Text", color: "emerald", text: result.normalizedText }
                ].map((col, i) => (
                  <Card key={i} className={`flex flex-col h-[700px] border-slate-800 bg-black/40 backdrop-blur-md shadow-xl overflow-hidden relative`}>
                    <div className={`absolute top-0 left-0 w-full h-1 bg-${col.color}-500/50`}></div>
                    <CardHeader className="border-b border-white/5 pb-5 bg-transparent flex-none z-10">
                      <div className="flex justify-between items-start mb-3">
                        <CardTitle className="text-xl text-slate-200 font-bold">{col.title}</CardTitle>
                        <Badge variant="outline" className="bg-slate-800 text-slate-300 border-none rounded-full px-3">
                          {col.text.length.toLocaleString('id-ID')} Karakter
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto overflow-x-hidden p-5 bg-transparent [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent">
                      <pre className="whitespace-pre-wrap break-words text-[12px] leading-relaxed text-slate-400 font-mono">{col.text}</pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* TAB: CHUNKS */}
            {activeTab === 'chunks' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[
                  { title: "Character Splitter", type: "character", color: "indigo", unit: "Karakter", calc: (t:string) => t.length },
                  { title: "Word Splitter", type: "word", color: "blue", unit: "Kata", calc: (t:string) => t.split(' ').length },
                  { title: "Sentence Splitter", type: "sentence", color: "emerald", unit: "Kalimat", calc: (t:string) => t.split(/[.!?]\s/).length }
                ].map((col, idx) => (
                  <Card key={idx} className="flex flex-col h-[850px] border-slate-800 bg-black/40 backdrop-blur-md shadow-xl overflow-hidden">
                     <CardHeader className="border-b border-slate-800/60 pb-5 bg-transparent flex-none z-10">
                      <div className="flex justify-between items-start mb-3">
                        <CardTitle className="text-xl text-slate-200 font-bold">{col.title}</CardTitle>
                        <Badge variant="outline" className="bg-slate-800 text-slate-300 border-none rounded-full px-3">
                          {result.chunks[col.type].length} Chunks
                        </Badge>
                      </div>
                      <CardDescription className="text-slate-500 font-mono text-xs mt-1">Batas Max Token: 512</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 bg-transparent [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent">
                      {result.chunks[col.type].map((c: any, i: number) => (
                        <div key={i} className="bg-white/5 p-5 rounded-xl border border-white/10 hover:border-white/20 transition-colors group relative overflow-hidden">
                          {/* Inner glow effect on hover */}
                          <div className={`absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}></div>
                          
                          <div className="flex justify-between items-center mb-4 relative z-10">
                            <span className="text-[10px] font-bold text-slate-500 tracking-widest bg-black/40 px-2 py-1 rounded">CHUNK #{i + 1}</span>
                            <Badge variant="secondary" className={`text-[10px] font-mono border border-white/10 bg-black/40 text-slate-300`}>
                              {c.tokens + 2} <span className="text-slate-600 ml-1">/ 512</span>
                            </Badge>
                          </div>
                          <p className="text-[13px] text-slate-300 leading-relaxed font-sans relative z-10 break-words">{c.text}</p>
                          <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center relative z-10">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Total {col.unit}</span>
                            <span className="text-xs font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded">{col.calc(c.text)}</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
