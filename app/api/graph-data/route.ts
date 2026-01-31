
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch relations to ensure connectivity
        const { data: relations, error } = await supabase
            .from("relations")
            .select(`
        id,
        relation,
        source:entities!relations_source_id_fkey(id, name, type),
        target:entities!relations_target_id_fkey(id, name, type)
      `)
            .limit(60); // Get enough to form a mesh

        if (error) throw error;

        // Process into Nodes and Links
        const nodesMap = new Map();
        const links: any[] = [];

        relations?.forEach((rel: any) => {
            if (!rel.source || !rel.target) return;

            // Add Source Node
            if (!nodesMap.has(rel.source.id)) {
                nodesMap.set(rel.source.id, {
                    id: rel.source.id,
                    name: rel.source.name,
                    type: rel.source.type,
                    val: 1 // importance
                });
            } else {
                nodesMap.get(rel.source.id).val += 1; // Increase size by connections
            }

            // Add Target Node
            if (!nodesMap.has(rel.target.id)) {
                nodesMap.set(rel.target.id, {
                    id: rel.target.id,
                    name: rel.target.name,
                    type: rel.target.type,
                    val: 1
                });
            } else {
                nodesMap.get(rel.target.id).val += 1;
            }

            // Add Link
            links.push({
                source: rel.source.id,
                target: rel.target.id,
                relation: rel.relation
            });
        });

        const nodes = Array.from(nodesMap.values());

        return NextResponse.json({ nodes, links });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
