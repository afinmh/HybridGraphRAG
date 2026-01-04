"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, FileText, Leaf, FlaskConical, Sparkles } from "lucide-react";

interface QueryEntity {
  name: string;
  type: string;
}

interface VectorResult {
  id: string;
  text: string;
  similarity: number;
  journal?: {
    title: string;
    author: string;
    year: string;
  };
}

interface GraphResult {
  herbs: Array<{ id: string; name: string; type: string }>;
  compounds: Array<{
    relation: string;
    source: { name: string; type: string };
    target: { name: string; type: string };
  }>;
  effects: Array<{
    relation: string;
    source: { name: string; type: string };
    target: { name: string; type: string };
  }>;
}

interface SearchResults {
  query: string;
  queryEntities: QueryEntity[];
  vectorResults: VectorResult[];
  graphResults: GraphResult;
  answer: string;
  summary: {
    totalChunks: number;
    totalHerbs: number;
    totalCompounds: number;
    totalEffects: number;
  };
}

export default function QueryPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState("");

  const exampleQueries = [
    "what herb for headache",
    "ginger benefits for diabetes",
    "anti-inflammatory herbs",
    "turmeric compounds and effects",
  ];

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, topK: 5 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to search");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const getEntityTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      PLANT: "bg-green-100 text-green-800 border-green-300",
      COMPOUND: "bg-blue-100 text-blue-800 border-blue-300",
      DISEASE: "bg-red-100 text-red-800 border-red-300",
      SYMPTOM: "bg-orange-100 text-orange-800 border-orange-300",
      EFFECT: "bg-purple-100 text-purple-800 border-purple-300",
    };
    return colors[type] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Hybrid Graph RAG Search
        </h1>
        <p className="text-gray-600">
          Search herbal medicine knowledge with AI-powered vector and graph search
        </p>
      </div>

      {/* Search Input */}
      <Card className="mb-8 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything... e.g., what herb for headache?"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                onKeyPress={(e) => e.key === "Enter" && !loading && handleSearch()}
                disabled={loading}
              />
            </div>
            <Button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* Example Queries */}
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map((example, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(example);
                    handleSearch(example);
                  }}
                  className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                  disabled={loading}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="mb-8 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">❌ {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Generated Answer */}
          <Card className="shadow-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-700">
                <Sparkles className="h-6 w-6" />
                AI Generated Answer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-emerald max-w-none">
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {results.answer}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Query Entities */}
          {results.queryEntities.length > 0 && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                  Query Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {results.queryEntities.map((entity, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className={getEntityTypeColor(entity.type)}
                    >
                      <span className="font-semibold">{entity.name}</span>
                      <span className="ml-1 text-xs opacity-70">({entity.type})</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="shadow-md">
              <CardContent className="pt-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="text-3xl font-bold text-blue-600">
                  {results.summary.totalChunks}
                </p>
                <p className="text-sm text-gray-600">Relevant Chunks</p>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardContent className="pt-6 text-center">
                <Leaf className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-3xl font-bold text-green-600">
                  {results.summary.totalHerbs}
                </p>
                <p className="text-sm text-gray-600">Herbs Found</p>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardContent className="pt-6 text-center">
                <FlaskConical className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <p className="text-3xl font-bold text-purple-600">
                  {results.summary.totalCompounds}
                </p>
                <p className="text-sm text-gray-600">Compounds</p>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardContent className="pt-6 text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <p className="text-3xl font-bold text-orange-600">
                  {results.summary.totalEffects}
                </p>
                <p className="text-sm text-gray-600">Effects</p>
              </CardContent>
            </Card>
          </div>

          {/* Knowledge Graph Results */}
          {results.graphResults.herbs.length > 0 && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-green-600" />
                  Knowledge Graph: Herbs & Compounds
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Herbs */}
                <div className="mb-6">
                  <h3 className="font-semibold text-sm text-gray-600 mb-3">
                    🌿 Relevant Herbs:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {results.graphResults.herbs.map((herb, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="px-3 py-1 bg-green-50 text-green-700 border-green-300"
                      >
                        {herb.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Compounds & Effects Path */}
                {results.graphResults.compounds.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600 mb-3">
                      🧪 Compound → Effect Pathways:
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {results.graphResults.compounds.slice(0, 10).map((rel, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded"
                        >
                          <span className="font-medium text-green-700">
                            {rel.source.name}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {rel.relation}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium text-blue-700">
                            {rel.target.name}
                          </span>
                        </div>
                      ))}
                      {results.graphResults.effects.slice(0, 10).map((rel, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded"
                        >
                          <span className="font-medium text-blue-700">
                            {rel.source.name}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            {rel.relation}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium text-purple-700">
                            {rel.target.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Vector Results */}
          {results.vectorResults.length > 0 && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Vector Search: Similar Text Chunks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.vectorResults.map((chunk, i) => (
                    <div
                      key={i}
                      className="p-4 border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <span className="font-semibold text-gray-700">
                            Chunk #{i + 1}
                          </span>
                          {chunk.journal && (
                            <span className="ml-3 text-sm text-gray-500">
                              from "{chunk.journal.title}" ({chunk.journal.year})
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                          {(chunk.similarity * 100).toFixed(1)}% match
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {chunk.text.substring(0, 300)}
                        {chunk.text.length > 300 && "..."}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
