-- Fix missing system columns in memento_employees table
-- Run this on reddwarf PostgreSQL

\c memento_mirror

-- Add missing modified_by column
ALTER TABLE memento_employees
ADD COLUMN IF NOT EXISTS modified_by VARCHAR(255);

-- Verify all system columns exist
DO $$
DECLARE
    missing_cols TEXT := '';
BEGIN
    -- Check for each required system column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'memento_employees' AND column_name = 'modified_by'
    ) THEN
        missing_cols := missing_cols || 'modified_by, ';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'memento_employees' AND column_name = 'name'
    ) THEN
        missing_cols := missing_cols || 'name, ';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'memento_employees' AND column_name = 'created_by'
    ) THEN
        missing_cols := missing_cols || 'created_by, ';
    END IF;

    IF missing_cols != '' THEN
        RAISE NOTICE 'Missing columns found: %', TRIM(TRAILING ', ' FROM missing_cols);
    ELSE
        RAISE NOTICE 'All system columns present ✅';
    END IF;
END $$;

-- Show current table structure
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'memento_employees'
ORDER BY ordinal_position;
