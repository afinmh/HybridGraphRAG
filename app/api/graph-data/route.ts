
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const typesParam = searchParams.get('types');
        const limitParam = searchParams.get('limit') || '150';
        const limit = parseInt(limitParam, 10);
        
        const selectedTypes = typesParam ? typesParam.split(',').map(t => t.trim().toUpperCase()) : [];

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch relations, get a large pool to allow for random sampling and connected component traversal
        const { data: allRelations, error } = await supabase
            .from("graph_sentence")
            .select(`
                id,
                journal_id,
                entity_1,
                type_1,
                relation,
                entity_2,
                type_2
            `)
            .limit(1500); // Fetch a large pool to traverse

        if (error) throw error;

        // Shuffle early so the graph varies on each randomize
        const shuffled = (allRelations || []).sort(() => 0.5 - Math.random());
        let relations: any[] = [];

        if (selectedTypes.length === 0) {
            // No filter, just take the limit
            relations = shuffled.slice(0, limit);
        } else {
            // Traversal/BFS to find all interconnected nodes starting from the filtered types
            const startNodes = new Set<string>();
            const adj = new Map<string, any[]>();

            // Build adjacency list and find starting nodes
            shuffled.forEach(rel => {
                if (!rel.entity_1 || !rel.entity_2) return;
                const e1 = rel.entity_1.toLowerCase();
                const e2 = rel.entity_2.toLowerCase();
                
                const t1 = (rel.type_1 || "").toUpperCase();
                const t2 = (rel.type_2 || "").toUpperCase();

                if (selectedTypes.includes(t1)) startNodes.add(e1);
                if (selectedTypes.includes(t2)) startNodes.add(e2);

                if (!adj.has(e1)) adj.set(e1, []);
                adj.get(e1)!.push(rel);
                
                if (!adj.has(e2)) adj.set(e2, []);
                adj.get(e2)!.push(rel);
            });

            const visitedNodes = new Set<string>();
            const collectedEdges = new Set<any>();
            const queue = Array.from(startNodes);

            // Mark start nodes as visited
            for (const node of queue) {
                visitedNodes.add(node);
            }

            let head = 0;
            while (head < queue.length && collectedEdges.size < limit) {
                const curr = queue[head++];
                const edges = adj.get(curr) || [];
                
                for (const edge of edges) {
                    if (collectedEdges.size >= limit) break;
                    
                    if (!collectedEdges.has(edge)) {
                        collectedEdges.add(edge);
                        
                        const next1 = edge.entity_1.toLowerCase();
                        const next2 = edge.entity_2.toLowerCase();

                        if (!visitedNodes.has(next1)) {
                            visitedNodes.add(next1);
                            queue.push(next1);
                        }
                        if (!visitedNodes.has(next2)) {
                            visitedNodes.add(next2);
                            queue.push(next2);
                        }
                    }
                }
            }

            relations = Array.from(collectedEdges);
        }

        // Process into Nodes and Links
        const nodesMap = new Map();
        const links: any[] = [];

        relations.forEach((rel: any) => {
            if (!rel.entity_1 || !rel.entity_2) return;

            // Generate unique IDs based on entity names (prevent duplicates)
            const sourceId = rel.entity_1.toLowerCase();
            const targetId = rel.entity_2.toLowerCase();

            // Add Source Node
            if (!nodesMap.has(sourceId)) {
                nodesMap.set(sourceId, {
                    id: sourceId,
                    name: rel.entity_1,
                    type: rel.type_1,
                    val: 1 // importance
                });
            } else {
                nodesMap.get(sourceId).val += 1; // Increase size by connections
            }

            // Add Target Node
            if (!nodesMap.has(targetId)) {
                nodesMap.set(targetId, {
                    id: targetId,
                    name: rel.entity_2,
                    type: rel.type_2,
                    val: 1
                });
            } else {
                nodesMap.get(targetId).val += 1;
            }

            // Add Link
            links.push({
                source: sourceId,
                target: targetId,
                relation: rel.relation,
                journal_id: rel.journal_id // Optional to keep track
            });
        });

        const nodes = Array.from(nodesMap.values());

        return NextResponse.json({ nodes, links });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
