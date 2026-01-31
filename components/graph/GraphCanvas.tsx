"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Leaf, FlaskConical, Activity, Sparkles, Dna } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Node {
    id: string;
    name: string;
    type: string;
    val: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
}

interface Link {
    source: string;
    target: string;
    relation: string;
    sourceNode?: Node;
    targetNode?: Node;
}

interface GraphData {
    nodes: any[];
    links: any[];
}

export const GraphCanvas = ({ data }: { data: GraphData }) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const simulationRef = useRef<any>(null); // To store animation frame or timeout if needed

    // Initialize
    useEffect(() => {
        if (!data.nodes.length) return;

        // Initialize positions randomly within reasonable bounds
        const initialNodes: Node[] = data.nodes.map(n => ({
            ...n,
            x: (Math.random() - 0.5) * 600,
            y: (Math.random() - 0.5) * 400,
            vx: 0,
            vy: 0
        }));

        const initialLinks = data.links.map(l => ({ ...l }));
        const nodeMap = new Map(initialNodes.map(n => [n.id, n]));

        initialLinks.forEach(l => {
            l.sourceNode = nodeMap.get(l.source);
            l.targetNode = nodeMap.get(l.target);
        });

        // Simulation Parameters
        const REPULSION = 6000;
        const SPRING_LEN = 180;
        const SPRING_K = 0.05;
        const CENTER_GRAVITY = 0.02;
        const DAMPING = 0.6;

        // Run 300 ticks to settle
        for (let k = 0; k < 300; k++) {
            for (let i = 0; i < initialNodes.length; i++) {
                const a = initialNodes[i];
                for (let j = i + 1; j < initialNodes.length; j++) {
                    const b = initialNodes[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const d2 = dx * dx + dy * dy + 0.1;
                    const d = Math.sqrt(d2);
                    if (d > 600) continue; // Optimization
                    const f = REPULSION / d2;
                    const fx = (dx / d) * f;
                    const fy = (dy / d) * f;
                    a.vx += fx; a.vy += fy;
                    b.vx -= fx; b.vy -= fy;
                }
            }
            initialLinks.forEach(link => {
                if (!link.sourceNode || !link.targetNode) return;
                const a = link.sourceNode;
                const b = link.targetNode;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const d = Math.sqrt(dx * dx + dy * dy) + 0.1;
                const f = (d - SPRING_LEN) * SPRING_K;
                const fx = (dx / d) * f;
                const fy = (dy / d) * f;
                a.vx += fx; a.vy += fy;
                b.vx -= fx; b.vy -= fy;
            });
            initialNodes.forEach(n => {
                n.vx -= n.x * CENTER_GRAVITY;
                n.vy -= n.y * CENTER_GRAVITY;
                n.vx *= DAMPING;
                n.vy *= DAMPING;
                n.x += n.vx;
                n.y += n.vy;
            });
        }

        setNodes(initialNodes);
        setLinks(initialLinks);
    }, [data]);

    // Icon & Color Helpers
    const getIcon = (type: string) => {
        const t = (type || "").toUpperCase();
        if (t === 'PLANT') return <Leaf className="w-5 h-5 text-green-200" />;
        if (t === 'COMPOUND') return <FlaskConical className="w-5 h-5 text-blue-200" />;
        if (t === 'DISEASE') return <Activity className="w-5 h-5 text-red-200" />;
        if (t === 'EFFECT') return <Sparkles className="w-5 h-5 text-amber-200" />;
        return <Dna className="w-5 h-5 text-gray-200" />;
    };

    const getTypeColor = (type: string) => {
        const t = (type || "").toUpperCase();
        if (t === 'PLANT') return "stroke-green-500 fill-green-900/80";
        if (t === 'COMPOUND') return "stroke-blue-500 fill-blue-900/80";
        if (t === 'DISEASE') return "stroke-red-500 fill-red-900/80";
        if (t === 'EFFECT') return "stroke-amber-500 fill-amber-900/80";
        return "stroke-gray-500 fill-gray-900/80";
    };

    // DRAG HANDLERS
    const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection
        setDraggingNodeId(nodeId);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!draggingNodeId || !svgRef.current) return;

        const svg = svgRef.current;
        const CTM = svg.getScreenCTM();
        if (!CTM) return;

        // Convert DOM mouse coords to SVG coords
        const x = (e.clientX - CTM.e) / CTM.a;
        const y = (e.clientY - CTM.f) / CTM.d;

        setNodes(prev => prev.map(n => {
            if (n.id === draggingNodeId) {
                return { ...n, x, y };
            }
            return n;
        }));
    }, [draggingNodeId]);

    const handleMouseUp = useCallback(() => {
        setDraggingNodeId(null);
    }, []);

    // Calculate Dynamic ViewBox to keep content centered
    const viewBox = useMemo(() => {
        if (nodes.length === 0) return "-400 -300 800 600";
        // Fixed viewbox for stability during drag usually better, but dynamic is fine if smooth
        // Let's use a semi-fixed big viewbox
        return "-500 -400 1000 800";
    }, []);

    // Fast lookup for rendering links based on current node positions
    const nodeLookup = useMemo(() => {
        return new Map(nodes.map(n => [n.id, n]));
    }, [nodes]);

    return (
        <div className="w-full h-[400px] md:h-[500px] relative overflow-hidden bg-black/30 rounded-3xl border border-white/10 backdrop-blur-sm shadow-2xl">
            <svg
                ref={svgRef}
                className="w-full h-full cursor-move"
                viewBox={viewBox}
                preserveAspectRatio="xMidYMid meet"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Edges */}
                <g className="links">
                    {links.map((link, i) => {
                        const src = nodeLookup.get(link.source);
                        const tgt = nodeLookup.get(link.target);
                        if (!src || !tgt) return null;

                        return (
                            <line
                                key={i}
                                x1={src.x}
                                y1={src.y}
                                x2={tgt.x}
                                y2={tgt.y}
                                stroke="white"
                                strokeWidth={1.5}
                                strokeOpacity={0.4}
                            />
                        );
                    })}
                </g>

                {/* Nodes */}
                <g className="nodes">
                    {nodes.map((node) => {
                        const isHovered = hoveredNode?.id === node.id;
                        const isDragging = draggingNodeId === node.id;
                        const radius = isHovered || isDragging ? 30 : 20;
                        const zIndexStr = isHovered || isDragging ? "front" : "back"; // SVG logic uses painter's algo, so we can't z-index easily without reordering.
                        // Ideally we move hovered node to end of array to be on top. But for now, just scaling.

                        return (
                            <g
                                key={node.id}
                                transform={`translate(${node.x},${node.y})`}
                                onMouseEnter={() => setHoveredNode(node)}
                                onMouseLeave={() => setHoveredNode(null)}
                                onMouseDown={(e) => handleMouseDown(e, node.id)}
                                className="transition-opacity duration-300"
                                style={{ opacity: hoveredNode && hoveredNode.id !== node.id && !links.some(l => (l.source === node.id && l.target === hoveredNode.id) || (l.target === node.id && l.source === hoveredNode.id)) ? 0.3 : 1 }}
                            >
                                {/* Glow Effect */}
                                <circle
                                    r={radius}
                                    className={`${getTypeColor(node.type)} transition-all duration-300 ease-out`}
                                    strokeWidth={isHovered ? 3 : 2}
                                    filter={isHovered ? "url(#glow)" : ""}
                                />

                                {/* Icon */}
                                <foreignObject
                                    x={-radius / 1.4}
                                    y={-radius / 1.4}
                                    width={radius * 1.4}
                                    height={radius * 1.4}
                                    className="pointer-events-none"
                                >
                                    <div className={`flex items-center justify-center w-full h-full transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}>
                                        {getIcon(node.type)}
                                    </div>
                                </foreignObject>
                            </g>
                        );
                    })}
                </g>
            </svg>

            {/* Hover Tooltip (Fixed Position Top-Left of Canavs) */}
            <AnimatePresence>
                {hoveredNode && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-6 left-6 max-w-xs z-50 bg-black/80 border border-white/20 backdrop-blur-xl p-5 rounded-2xl shadow-2xl pointer-events-none"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg bg-white/10 ${getTypeColor(hoveredNode.type).split(' ')[0].replace('stroke-', 'text-')}`}>
                                {getIcon(hoveredNode.type)}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white leading-none">{hoveredNode.name}</h3>
                                <span className="text-xs font-mono uppercase text-emerald-400 mt-1 block">
                                    {hoveredNode.type}
                                </span>
                            </div>
                        </div>
                        <div className="text-xs text-gray-400 border-t border-white/10 pt-3 flex gap-4">
                            <div>
                                <strong className="text-white block">Connections</strong>
                                {hoveredNode.val} Linked Entities
                            </div>
                            <div>
                                <strong className="text-white block">Coordinates</strong>
                                {Math.round(hoveredNode.x)}, {Math.round(hoveredNode.y)}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Legend */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 pointer-events-none">
                {[
                    { type: 'PLANT', color: 'bg-green-500', label: 'Medicinal Plant' },
                    { type: 'COMPOUND', color: 'bg-blue-500', label: 'Active Compound' },
                    { type: 'DISEASE', color: 'bg-red-500', label: 'Disease Condition' },
                    { type: 'EFFECT', color: 'bg-amber-500', label: 'Therapeutic Effect' }
                ].map(item => (
                    <div key={item.type} className="flex items-center justify-end gap-3 px-4 py-2 bg-black/40 border border-white/5 rounded-full backdrop-blur-sm">
                        <span className="text-xs text-gray-300 font-medium">{item.label}</span>
                        <div className={`w-2.5 h-2.5 rounded-full ${item.color} shadow-[0_0_10px_currentColor]`}></div>
                    </div>
                ))}
            </div>
        </div>
    );
};
