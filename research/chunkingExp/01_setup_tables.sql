-- Tabel untuk menyimpan metadata jurnal dan teks original (opsional)
CREATE TABLE IF NOT EXISTS journals_experiment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_name TEXT,
    title TEXT,
    authors TEXT,
    year TEXT,
    full_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabel untuk hasil eksperimen Chunking per Kata (Token)
CREATE TABLE IF NOT EXISTS chunk_word (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_id UUID REFERENCES journals_experiment(id) ON DELETE CASCADE,
    chunk_index INTEGER,
    text_content TEXT,
    token_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabel untuk hasil eksperimen Chunking per Kalimat (Sentence)
CREATE TABLE IF NOT EXISTS chunk_sentence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_id UUID REFERENCES journals_experiment(id) ON DELETE CASCADE,
    chunk_index INTEGER,
    text_content TEXT,
    sentence_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabel untuk hasil eksperimen Chunking per Karakter (Character)
CREATE TABLE IF NOT EXISTS chunk_character (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_id UUID REFERENCES journals_experiment(id) ON DELETE CASCADE,
    chunk_index INTEGER,
    text_content TEXT,
    char_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mengaktifkan Row Level Security (RLS) agar aman 
ALTER TABLE journals_experiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunk_word ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunk_sentence ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunk_character ENABLE ROW LEVEL SECURITY;

-- Membuat policy agar service_role (backend) bisa melakukan CRUD sebebasnya, tapi publik tidak
CREATE POLICY "Enable all access for service role on journals_experiment" ON journals_experiment FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Enable all access for service role on chunk_word" ON chunk_word FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Enable all access for service role on chunk_sentence" ON chunk_sentence FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Enable all access for service role on chunk_character" ON chunk_character FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Index untuk mempercepat query saat eksperimen
CREATE INDEX IF NOT EXISTS idx_chunk_word_journal_id ON chunk_word(journal_id);
CREATE INDEX IF NOT EXISTS idx_chunk_sentence_journal_id ON chunk_sentence(journal_id);
CREATE INDEX IF NOT EXISTS idx_chunk_character_journal_id ON chunk_character(journal_id);
