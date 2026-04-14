-- Tabel untuk menyimpan Graph yang diekstraksi dari Chunk Character
CREATE TABLE IF NOT EXISTS graph_character (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_id UUID REFERENCES journals_experiment(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES chunk_character(id) ON DELETE CASCADE,
    entity_1 TEXT NOT NULL,
    type_1 TEXT NOT NULL,
    relation TEXT NOT NULL,
    entity_2 TEXT NOT NULL,
    type_2 TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabel untuk menyimpan Graph yang diekstraksi dari Chunk Word
CREATE TABLE IF NOT EXISTS graph_word (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_id UUID REFERENCES journals_experiment(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES chunk_word(id) ON DELETE CASCADE,
    entity_1 TEXT NOT NULL,
    type_1 TEXT NOT NULL,
    relation TEXT NOT NULL,
    entity_2 TEXT NOT NULL,
    type_2 TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabel untuk menyimpan Graph yang diekstraksi dari Chunk Sentence
CREATE TABLE IF NOT EXISTS graph_sentence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_id UUID REFERENCES journals_experiment(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES chunk_sentence(id) ON DELETE CASCADE,
    entity_1 TEXT NOT NULL,
    type_1 TEXT NOT NULL,
    relation TEXT NOT NULL,
    entity_2 TEXT NOT NULL,
    type_2 TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mengaktifkan Row Level Security (RLS) agar aman 
ALTER TABLE graph_character ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_word ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_sentence ENABLE ROW LEVEL SECURITY;

-- Membuat policy agar service_role (backend) bisa melakukan CRUD sebebasnya, tapi publik tidak
CREATE POLICY "Enable all access for service role on graph_character" ON graph_character FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Enable all access for service role on graph_word" ON graph_word FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Enable all access for service role on graph_sentence" ON graph_sentence FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Index untuk mempercepat query saat eksperimen (mencari relasi spesifik)
CREATE INDEX IF NOT EXISTS idx_graph_char_journal_id ON graph_character(journal_id);
CREATE INDEX IF NOT EXISTS idx_graph_char_chunk_id ON graph_character(chunk_id);
CREATE INDEX IF NOT EXISTS idx_graph_char_entities ON graph_character(entity_1, entity_2);

CREATE INDEX IF NOT EXISTS idx_graph_word_journal_id ON graph_word(journal_id);
CREATE INDEX IF NOT EXISTS idx_graph_word_chunk_id ON graph_word(chunk_id);
CREATE INDEX IF NOT EXISTS idx_graph_word_entities ON graph_word(entity_1, entity_2);

CREATE INDEX IF NOT EXISTS idx_graph_sentence_journal_id ON graph_sentence(journal_id);
CREATE INDEX IF NOT EXISTS idx_graph_sentence_chunk_id ON graph_sentence(chunk_id);
CREATE INDEX IF NOT EXISTS idx_graph_sentence_entities ON graph_sentence(entity_1, entity_2);
