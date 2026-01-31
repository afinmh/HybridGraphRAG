import { Sparkles, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QueryEntity {
    name: string;
    type: string;
}

export const QueryAnalysis = ({ entities }: { entities: QueryEntity[] }) => {
    if (entities.length === 0) return null;

    const getColor = (type: string) => {
        switch (type.toUpperCase()) {
            case 'PLANT': return "bg-green-500/10 text-green-400 border-green-500/20";
            case 'COMPOUND': return "bg-blue-500/10 text-blue-400 border-blue-500/20";
            case 'DISEASE': return "bg-red-500/10 text-red-400 border-red-500/20";
            case 'SYMPTOM': return "bg-orange-500/10 text-orange-400 border-orange-500/20";
            case 'EFFECT': return "bg-purple-500/10 text-purple-400 border-purple-500/20";
            default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
        }
    };

    return (
        <div className="flex items-center gap-4 flex-wrap p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                <Tag className="w-4 h-4" />
                <span>Detected Entities:</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {entities.map((entity, i) => (
                    <Badge
                        key={i}
                        variant="outline"
                        className={`${getColor(entity.type)} px-3 py-1 font-mono text-xs`}
                    >
                        {entity.name}
                        <span className="ml-1 opacity-50 text-[10px]">({entity.type})</span>
                    </Badge>
                ))}
            </div>
        </div>
    );
};
