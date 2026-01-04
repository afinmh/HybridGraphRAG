-- ============================================================
-- ALTER TABLE: Add year column to journals table
-- Run this if you already have the journals table created
-- ============================================================

-- Add year column to journals table
ALTER TABLE journals 
ADD COLUMN IF NOT EXISTS year TEXT;

-- Create index for year column for faster queries
CREATE INDEX IF NOT EXISTS idx_journals_year ON journals(year);

-- ============================================================
-- Verify the changes
-- ============================================================
-- Run this to check the structure:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'journals';

-- ============================================================
-- Update existing rows (optional)
-- ============================================================
-- If you have existing journals without year, you can set a default:
-- UPDATE journals 
-- SET year = '2025' 
-- WHERE year IS NULL;

-- Or extract year from created_at:
-- UPDATE journals 
-- SET year = EXTRACT(YEAR FROM created_at)::TEXT 
-- WHERE year IS NULL;
