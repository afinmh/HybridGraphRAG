import { FileText, Leaf, FlaskConical, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface StatsProps {
    summary: {
        totalChunks: number;
        totalHerbs: number;
        totalCompounds: number;
        totalEffects: number;
    };
}

export const StatsOverview = ({ summary }: StatsProps) => {
    const stats = [
        {
            label: "Relevant Sources",
            value: summary.totalChunks,
            icon: FileText,
            color: "text-blue-400",
            bg: "bg-blue-500/10 border-blue-500/20"
        },
        {
            label: "Herbs Identified",
            value: summary.totalHerbs,
            icon: Leaf,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10 border-emerald-500/20"
        },
        {
            label: "Compounds Found",
            value: summary.totalCompounds,
            icon: FlaskConical,
            color: "text-purple-400",
            bg: "bg-purple-500/10 border-purple-500/20"
        },
        {
            label: "Effects Analyzed",
            value: summary.totalEffects,
            icon: Sparkles,
            color: "text-orange-400",
            bg: "bg-orange-500/10 border-orange-500/20"
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + (idx * 0.1) }}
                    className={`p-4 rounded-2xl border backdrop-blur-sm ${stat.bg} flex items-center gap-4`}
                >
                    <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                        <stat.icon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className={`text-2xl font-bold font-mono ${stat.color}`}>
                            {stat.value}
                        </div>
                        <div className="text-xs text-gray-400 font-medium tracking-wide uppercase">
                            {stat.label}
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};
