
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q");

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        let dbQuery = supabase
            .from("journals_experiment")
            .select("id, title, authors, year, file_name, created_at")
            .order("created_at", { ascending: false });

        if (query) {
            dbQuery = dbQuery.or(`title.ilike.%${query}%,authors.ilike.%${query}%`);
        }

        const { data, error } = await dbQuery;

        if (error) {
            console.error("Error fetching documents:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Map file_name to file_url manually
        const documents = data?.map((doc: any) => ({
            ...doc,
            file_url: `${supabaseUrl}/storage/v1/object/public/documents/${doc.file_name}` // Adjust "documents" bucket if needed
        })) || [];

        return NextResponse.json({ documents: documents });
    } catch (error) {
        console.error("Server error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
