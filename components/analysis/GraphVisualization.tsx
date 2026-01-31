import { Leaf, GitBranch, ArrowRight, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export const GraphVisualization = ({ data }: { data: GraphResult }) => {
    if (data.herbs.length === 0 && data.compounds.length === 0 && data.effects.length === 0) return null;

    return (
        <div className="rounded-3xl border border-white/10 bg-black/20 backdrop-blur-md p-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-6 text-emerald-400">
                <Share2 className="w-5 h-5" />
                <h3 className="font-bold tracking-wide">Knowledge Graph Connections</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Herbs */}
                {data.herbs.length > 0 && (
                    <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                            <Leaf className="w-4 h-4" /> Identified Herbs
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {data.herbs.map((herb, i) => (
                                <Badge
                                    key={i}
                                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1.5 transition-colors"
                                >
                                    {herb.name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Relations */}
                {(data.compounds.length > 0 || data.effects.length > 0) && (
                    <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                            <GitBranch className="w-4 h-4" /> Bio-Active Pathways
                        </h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {[...data.compounds, ...data.effects].slice(0, 10).map((rel, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-white/5 border border-white/5">
                                    <span className="font-medium text-emerald-300">{rel.source.name}</span>
                                    <ArrowRight className="w-3 h-3 text-gray-500" />
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-gray-300">{rel.relation}</span>
                                    <ArrowRight className="w-3 h-3 text-gray-500" />
                                    <span className="font-medium text-blue-300">{rel.target.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
