
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const GraphHeader = () => {
    return (
        <div className="flex items-center justify-between mb-8 relative z-10 w-full">
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button variant="ghost" size="sm" className="bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 rounded-full gap-2">
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </Button>
                </Link>
                <div className="h-6 w-px bg-white/10" />
                <h1 className="text-lg md:text-xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
                    Herbal Knowledge Graph
                </h1>
            </div>
            <div className="hidden md:block">
                <p className="text-gray-400 max-w-sm text-xs text-right">
                    Explore the complex web of relationships between plants, compounds, and diseases.
                </p>
            </div>
        </div>
    );
};
