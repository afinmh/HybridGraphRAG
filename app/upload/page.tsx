"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Download, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Chunk {
  id: number;
  text: string;
  wordCount: number;
  charCount: number;
}

interface VectorResult {
  chunkId: number;
  vector: number[];
  dimension: number;
}

interface Entity {
  name: string;
  type: string;
}

interface Relation {
  source: string;
  relation: string;
  target: string;
}

interface GraphResult {
  chunkId: number;
  entities: Entity[];
  relations: Relation[];
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [cleanedText, setCleanedText] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [selectedChunk, setSelectedChunk] = useState<number | null>(null);
  const [showAllChunks, setShowAllChunks] = useState(false);
  const [vectors, setVectors] = useState<VectorResult[]>([]);
  const [vectorizing, setVectorizing] = useState(false);
  const [graphs, setGraphs] = useState<GraphResult[]>([]);
  const [extractingGraph, setExtractingGraph] = useState(false);
  const [showAllVectors, setShowAllVectors] = useState(false);
  const [showAllGraphs, setShowAllGraphs] = useState(false);
  const [uploadingToDb, setUploadingToDb] = useState(false);
  const [metadata, setMetadata] = useState<{ title: string; author: string; year: string } | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [extractionProgress, setExtractionProgress] = useState<{ current: number; total: number } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cleanedTextRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError("");
      setExtractedText("");
      setCleanedText("");
      setChunks([]);
      setSelectedChunk(null);
    } else {
      setError("Please select a valid PDF file");
      setFile(null);
    }
  };

  // Function to create chunks from text (sentence-based)
  const createChunks = (text: string, sentencesPerChunk: number = 12, overlapSentences: number = 3): Chunk[] => {
    // Remove "Judul:", "Penulis:", "Tahun:", "Isi:" metadata
    const contentMatch = text.match(/Isi:\s*([\s\S]*)/);
    const content = contentMatch ? contentMatch[1].trim() : text;
    
    // Split by sentences (detect period, exclamation, question mark followed by space or newline)
    const sentences = content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 10); // Filter out very short sentences
    
    const chunks: Chunk[] = [];
    let chunkId = 1;
    
    for (let i = 0; i < sentences.length; i += sentencesPerChunk - overlapSentences) {
      const chunkSentences = sentences.slice(i, i + sentencesPerChunk);
      const chunkText = chunkSentences.join(' ');
      
      if (chunkText.trim().length > 0) {
        const wordCount = chunkText.split(/\s+/).length;
        chunks.push({
          id: chunkId++,
          text: chunkText,
          wordCount: wordCount,
          charCount: chunkText.length,
        });
      }
      
      // Break if we've reached the end
      if (i + sentencesPerChunk >= sentences.length) break;
    }
    
    return chunks;
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Upload file to storage first
      const uploadResponse = await fetch("/api/upload-file", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      const uploadData = await uploadResponse.json();
      setFileUrl(uploadData.publicUrl);
      console.log("File uploaded to storage:", uploadData.publicUrl);

      // 2. Extract text from PDF
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process PDF");
      }

      const data = await response.json();
      setExtractedText(data.rawText);
      setCleanedText(data.cleanedText);
      
      // Save metadata (always set, use fallback if not provided)
      const extractedMetadata = {
        title: data.metadata?.title || file.name.replace('.pdf', ''),
        author: data.metadata?.author || 'Unknown Author',
        year: data.metadata?.year || new Date().getFullYear().toString(),
      };
      setMetadata(extractedMetadata);
      console.log('Metadata saved:', extractedMetadata);
      
      // Create chunks from cleaned text
      const generatedChunks = createChunks(data.cleanedText);
      setChunks(generatedChunks);
      console.log(`Created ${generatedChunks.length} chunks`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl("");
    setExtractedText("");
    setCleanedText("");
    setChunks([]);
    setSelectedChunk(null);
    setShowAllChunks(false);
    setVectors([]);
    setGraphs([]);
    setShowAllVectors(false);
    setShowAllGraphs(false);
    setMetadata(null);
    setFileUrl("");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleVectorize = async () => {
    if (chunks.length === 0) return;
    
    setVectorizing(true);
    setError("");
    
    try {
      const response = await fetch("/api/vectorize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chunks: chunks.map(c => ({ id: c.id, text: c.text })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to vectorize chunks");
      }

      const data = await response.json();
      setVectors(data.vectors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to vectorize");
    } finally {
      setVectorizing(false);
    }
  };

  const handleGraphExtraction = async () => {
    if (chunks.length === 0) return;
    
    setExtractingGraph(true);
    setError("");
    setExtractionProgress({ current: 0, total: chunks.length });
    
    try {
      const response = await fetch("/api/extract-graph", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chunks: chunks.map(c => ({ id: c.id, text: c.text })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to extract graph");
      }

      const data = await response.json();
      setGraphs(data.graphs);
      setExtractionProgress({ current: data.processed || data.graphs.length, total: chunks.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract graph");
    } finally {
      setExtractingGraph(false);
      setTimeout(() => setExtractionProgress(null), 2000); // Clear progress after 2s
    }
  };

  const handleUploadToDatabase = async () => {
    // Detailed validation with logging
    if (!metadata) {
      setError("Missing metadata. Please re-upload the PDF.");
      return;
    }
    
    if (vectors.length === 0) {
      setError("Please vectorize chunks first (click Vektorisasi button)");
      return;
    }
    
    if (graphs.length === 0) {
      setError("Please extract graph first (click Extract Graph button)");
      return;
    }
    
    if (!fileUrl) {
      setError("File URL missing. Please re-upload the PDF.");
      return;
    }
    
    setUploadingToDb(true);
    setError("");
    
    try {
      const response = await fetch("/api/save-to-db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metadata,
          fileUrl,
          chunks: chunks.map(c => ({ id: c.id, text: c.text, wordCount: c.wordCount })),
          vectors,
          graphs,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || "Failed to upload to database");
      }

      const data = await response.json();
      
      // Show success modal
      setUploadResult(data);
      setShowSuccessModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload to database");
    } finally {
      setUploadingToDb(false);
    }
  };

  const handleChunkClick = (chunkId: number, chunkText: string) => {
    setSelectedChunk(chunkId);
    
    // Scroll to and highlight the text in cleaned text area
    if (cleanedTextRef.current) {
      // Find the chunk text in the cleaned text display
      const preElement = cleanedTextRef.current.querySelector('pre');
      if (preElement) {
        const fullText = preElement.textContent || '';
        const index = fullText.indexOf(chunkText.substring(0, 50)); // Find first 50 chars
        
        if (index !== -1) {
          // Scroll to the element
          cleanedTextRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Create temporary highlight effect
          preElement.style.transition = 'background-color 0.3s';
          preElement.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
          
          setTimeout(() => {
            preElement.style.backgroundColor = '';
          }, 2000);
        }
      }
    }
  };

  const handleDownloadCleaned = () => {
    const blob = new Blob([cleanedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cleaned_${file?.name.replace(".pdf", ".txt") || "document.txt"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-green-950/20">
      {/* Header */}
      <div className="border-b border-green-200/50 dark:border-green-900/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent dark:from-green-400 dark:to-emerald-400">
                  Upload Jurnal PDF
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ekstraksi dan preprocessing teks dari jurnal</p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <a href="/">Kembali ke Home</a>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Top Section: Upload & Preview */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Upload Section */}
          <Card className="border-green-200/50 dark:border-green-900/50 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center space-x-2 text-xl">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <span>Upload Jurnal PDF</span>
              </CardTitle>
              <CardDescription className="text-base">
                Upload file jurnal dalam format PDF untuk ekstraksi dan preprocessing teks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Drag & Drop Area */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                  file
                    ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20"
                    : "border-gray-300 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50/50 dark:hover:bg-green-950/10"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center space-y-6">
                    {file ? (
                      <>
                        <div className="relative">
                          <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse"></div>
                          <CheckCircle2 className="relative w-20 h-20 text-green-600 dark:text-green-500 animate-float" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {file.name}
                          </p>
                          <div className="flex items-center justify-center space-x-4 text-sm">
                            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-3 py-1">
                              <FileText className="w-3 h-3 mr-1" />
                              PDF
                            </Badge>
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gray-300/20 dark:bg-gray-700/20 rounded-full blur-xl"></div>
                          <Upload className="relative w-20 h-20 text-gray-400 dark:text-gray-600" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xl font-bold text-gray-900 dark:text-white">
                            Klik untuk upload PDF
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            atau drag and drop file di sini
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            Maksimal ukuran file: 10 MB
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center space-x-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900/50 animate-float">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      <span className="font-semibold">Memproses PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-5 w-5" />
                      <span className="font-semibold">Ekstrak Teks</span>
                    </>
                  )}
                </Button>
                {file && (
                  <Button 
                    onClick={handleReset} 
                    variant="outline" 
                    size="icon"
                    className="h-12 w-12 border-gray-300 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 transition-all duration-300"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {/* Info Cards */}
              {!file && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-start space-x-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">Ekstraksi Otomatis</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Metadata & konten</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">AI Cleaning</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Header & footer dihapus</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview PDF */}
          {previewUrl ? (
            <Card className="border-green-200/50 dark:border-green-900/50">
              <CardHeader>
                <CardTitle>Preview Jurnal</CardTitle>
                <CardDescription>Pratinjau dokumen yang diupload</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <iframe
                    src={previewUrl}
                    className="w-full h-[400px]"
                    title="PDF Preview"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-gray-200/50 dark:border-gray-700/50">
              <CardContent className="py-24 text-center">
                <FileText className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Preview jurnal akan muncul di sini
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bottom Section: Side-by-side Comparison */}
        {(extractedText || cleanedText) && (
          <>
            <Separator className="my-8" />
            
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Perbandingan Hasil Ekstraksi
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bandingkan teks mentah dari PDF dengan hasil preprocessing yang sudah dibersihkan
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Raw Text - Left */}
              <Card className="border-gray-200/50 dark:border-gray-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                      Raw
                    </Badge>
                    <span>Teks Mentah</span>
                  </CardTitle>
                  <CardDescription>Hasil ekstraksi langsung dari PDF</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 h-[600px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-400 font-mono leading-relaxed">
                      {extractedText}
                    </pre>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>{extractedText.split(/\s+/).length} kata</span>
                    <span>{extractedText.length} karakter</span>
                  </div>
                </CardContent>
              </Card>

              {/* Cleaned Text - Right */}
              <Card className="border-emerald-200/50 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                          Cleaned
                        </Badge>
                        <span>Teks Bersih</span>
                      </CardTitle>
                      <CardDescription>
                        Hasil preprocessing (header, footer, dan noise dihapus)
                      </CardDescription>
                    </div>
                    <Button onClick={handleDownloadCleaned} size="sm" variant="outline" className="border-emerald-300 dark:border-emerald-800">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div ref={cleanedTextRef} className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800 h-[600px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
                      {cleanedText}
                    </pre>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                    <span>{cleanedText.split(/\s+/).length} kata</span>
                    <span>{cleanedText.length} karakter</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Chunking Results Section */}
        {chunks.length > 0 && (
          <>
            <Separator className="my-8" />
            
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Hasil Chunking
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Teks dibagi menjadi {chunks.length} chunk berdasarkan kalimat (12 kalimat/chunk dengan overlap 3 kalimat)
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-4 py-2">
                    Total: {chunks.length} chunks
                  </Badge>
                  <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 px-4 py-2">
                    ~{Math.round(chunks.reduce((acc, c) => acc + c.wordCount, 0) / chunks.length)} kata/chunk
                  </Badge>
                  <Button
                    onClick={handleVectorize}
                    disabled={vectorizing || vectors.length > 0}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  >
                    {vectorizing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Vektorisasi...
                      </>
                    ) : vectors.length > 0 ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Selesai
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Vektorisasi
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleGraphExtraction}
                    disabled={extractingGraph || graphs.length > 0}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  >
                    {extractingGraph ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {extractionProgress ? (
                          <span>Extracting {extractionProgress.current}/{extractionProgress.total}...</span>
                        ) : (
                          <span>Extract Graph...</span>
                        )}
                      </>
                    ) : graphs.length > 0 ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Selesai
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Extract Graph
                      </>
                    )}
                  </Button>
                  {vectors.length > 0 && graphs.length > 0 && (
                    <Button
                      onClick={handleUploadToDatabase}
                      disabled={uploadingToDb}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    >
                      {uploadingToDb ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload to Database
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {(showAllChunks ? chunks : chunks.slice(0, 5)).map((chunk) => (
                <Card
                  key={chunk.id}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                    selectedChunk === chunk.id
                      ? "border-emerald-500 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-lg"
                      : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700"
                  }`}
                  onClick={() => handleChunkClick(chunk.id, chunk.text)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center space-x-2">
                        <Badge 
                          variant="outline" 
                          className={`${
                            selectedChunk === chunk.id
                              ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          Chunk {chunk.id}
                        </Badge>
                        {selectedChunk === chunk.id && (
                          <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center">
                          <FileText className="w-3 h-3 mr-1" />
                          {chunk.wordCount} kata
                        </span>
                        <span>•</span>
                        <span>{chunk.charCount} karakter</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 leading-relaxed">
                      {chunk.text}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {chunks.length > 5 && (
              <div className="mt-6 text-center">
                <Button
                  onClick={() => setShowAllChunks(!showAllChunks)}
                  variant="outline"
                  className="border-gray-300 dark:border-gray-700"
                >
                  {showAllChunks ? (
                    <>
                      Tampilkan Lebih Sedikit
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Lihat Semua {chunks.length} Chunks
                      <FileText className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Vectorization Results Section */}
        {vectors.length > 0 && (
          <>
            <Separator className="my-8" />
            
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Hasil Vektorisasi
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Embedding menggunakan model <span className="font-mono font-semibold">BAAI/bge-small-en-v1.5</span>
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 px-4 py-2">
                    {vectors.length} vectors
                  </Badge>
                  <Badge variant="outline" className="bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 px-4 py-2">
                    Dimensi: {vectors[0]?.dimension || 0}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {(showAllVectors ? vectors : vectors.slice(0, 5)).map((vectorResult) => (
                <Card key={vectorResult.chunkId} className="border-indigo-200/50 dark:border-indigo-900/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center space-x-2">
                        <Badge variant="outline" className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                          Vector {vectorResult.chunkId}
                        </Badge>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          (dari Chunk {vectorResult.chunkId})
                        </span>
                      </CardTitle>
                      <Badge variant="outline" className="bg-cyan-50 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300">
                        {vectorResult.dimension}D
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Vector Preview */}
                      <div className="bg-gradient-to-r from-indigo-50 to-cyan-50 dark:from-indigo-950/20 dark:to-cyan-950/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                        <p className="text-xs font-mono text-gray-600 dark:text-gray-400 mb-2">
                          Vector Preview (first 10 dimensions):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {vectorResult.vector.slice(0, 10).map((val, idx) => (
                            <Badge 
                              key={idx} 
                              variant="secondary" 
                              className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-xs"
                            >
                              {val.toFixed(4)}
                            </Badge>
                          ))}
                          {vectorResult.vector.length > 10 && (
                            <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-500">
                              ... +{vectorResult.vector.length - 10} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Statistics */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Min Value</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                            {Math.min(...vectorResult.vector).toFixed(4)}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Max Value</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                            {Math.max(...vectorResult.vector).toFixed(4)}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mean Value</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                            {(vectorResult.vector.reduce((a, b) => a + b, 0) / vectorResult.vector.length).toFixed(4)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {vectors.length > 5 && (
              <div className="mt-6 text-center">
                <Button
                  onClick={() => setShowAllVectors(!showAllVectors)}
                  variant="outline"
                  className="border-gray-300 dark:border-gray-700"
                >
                  {showAllVectors ? (
                    <>
                      Tampilkan Lebih Sedikit
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Lihat Semua {vectors.length} Vectors
                      <FileText className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Graph Extraction Results Section */}
        {graphs.length > 0 && (
          <>
            <Separator className="my-8" />
            
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Hasil Knowledge Graph
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Entities dan Relations diekstrak menggunakan Mistral LLM
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 px-4 py-2">
                    {graphs.reduce((acc, g) => acc + g.entities.length, 0)} entities
                  </Badge>
                  <Badge variant="outline" className="bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 px-4 py-2">
                    {graphs.reduce((acc, g) => acc + g.relations.length, 0)} relations
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              {(showAllGraphs ? graphs : graphs.slice(0, 5)).map((graphResult) => (
                <Card key={graphResult.chunkId} className="border-purple-200/50 dark:border-purple-900/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                        Graph {graphResult.chunkId}
                      </Badge>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        (dari Chunk {graphResult.chunkId})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid lg:grid-cols-2 gap-4">
                      {/* Entities */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Entities ({graphResult.entities.length})
                          </h3>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800 max-h-[300px] overflow-y-auto">
                          <div className="space-y-2">
                            {graphResult.entities.map((entity, idx) => (
                              <div key={idx} className="flex items-center space-x-2 bg-white dark:bg-gray-900 rounded-md p-2 border border-purple-100 dark:border-purple-900">
                                <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs">
                                  {entity.type}
                                </Badge>
                                <span className="text-sm text-gray-900 dark:text-white font-medium">
                                  {entity.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Relations */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Relations ({graphResult.relations.length})
                          </h3>
                        </div>
                        <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 rounded-lg p-4 border border-pink-200 dark:border-pink-800 max-h-[300px] overflow-y-auto">
                          <div className="space-y-3">
                            {graphResult.relations.map((relation, idx) => (
                              <div key={idx} className="bg-white dark:bg-gray-900 rounded-md p-3 border border-pink-100 dark:border-pink-900">
                                <div className="flex items-center space-x-2 text-sm">
                                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs">
                                    {relation.source}
                                  </Badge>
                                  <span className="text-gray-400 dark:text-gray-600">→</span>
                                  <Badge variant="secondary" className="bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 text-xs">
                                    {relation.relation}
                                  </Badge>
                                  <span className="text-gray-400 dark:text-gray-600">→</span>
                                  <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">
                                    {relation.target}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {graphs.length > 5 && (
              <div className="mt-6 text-center">
                <Button
                  onClick={() => setShowAllGraphs(!showAllGraphs)}
                  variant="outline"
                  className="border-gray-300 dark:border-gray-700"
                >
                  {showAllGraphs ? (
                    <>
                      Tampilkan Lebih Sedikit
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Lihat Semua {graphs.length} Graphs
                      <FileText className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Berhasil!</h3>
              <div className="mt-4 text-sm text-gray-600 space-y-2">
                <p><strong>Journal ID:</strong> {uploadResult?.journalId}</p>
                <p><strong>Embeddings:</strong> {uploadResult?.embeddingsCount}</p>
                <p><strong>Entities:</strong> {uploadResult?.entitiesCount}</p>
                <p><strong>Relations:</strong> {uploadResult?.relationsCount}</p>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    handleReset();
                  }}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Baru
                </button>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
