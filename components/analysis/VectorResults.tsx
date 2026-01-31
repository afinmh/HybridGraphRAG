import { FileText, ExternalLink, BookOpen } from "lucide-react";

interface VectorResult {
    id: string;
    text: string;
    similarity: number;
    journal?: {
        title: string;
        author: string;
        year: string;
        file_url?: string;
    };
}

export const VectorResults = ({ results }: { results: VectorResult[] }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                Retrieved Context
            </h3>
            <div className="grid gap-4">
                {results.map((chunk, i) => (
                    <div
                        key={i}
                        className="group relative p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                                        Chunk #{i + 1}
                                    </span>
                                    <span className="text-xs font-mono text-gray-500">
                                        {Math.round(chunk.similarity * 100)}% Match
                                    </span>
                                </div>
                                {chunk.journal && (
                                    <h4 className="font-semibold text-emerald-100 line-clamp-1 group-hover:text-emerald-400 transition-colors">
                                        {chunk.journal.title}
                                    </h4>
                                )}
                            </div>
                            {chunk.journal?.file_url && (
                                <a
                                    href={`${chunk.journal.file_url}#search="${encodeURIComponent(chunk.text.substring(0, 50))}"`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors"
                                    title="Open Source PDF"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                        </div>

                        <p className="text-sm text-gray-300 leading-relaxed font-serif italic border-l-2 border-white/10 pl-4 py-1">
                            "{chunk.text}"
                        </p>

                        {chunk.journal && (
                            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 font-mono">
                                <span>Author: {chunk.journal.author}</span>
                                <span>Year: {chunk.journal.year}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
