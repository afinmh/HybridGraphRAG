
import { BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";

export const LibraryHeader = () => {
    return (
        <div className="mb-8 relative z-10">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-500/80 mb-4">
                <Link href="/" className="hover:text-emerald-400 transition-colors">HOME</Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-white">LIBRARY</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Digital Repository
                <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 text-xl md:text-2xl font-normal opacity-90">
                    Explore Herbal Medicine Research
                </span>
            </h1>

            <p className="text-gray-400 max-w-2xl text-sm md:text-base leading-relaxed">
                Access our complete collection of scientific journals and research papers used to ground our AI analysis.
            </p>
        </div>
    );
};
