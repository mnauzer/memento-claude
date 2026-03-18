-- Add missing email_enabled column to memento_employees table
-- Run this if the column doesn't exist

-- Check if column exists first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'memento_employees'
        AND column_name = 'email_enabled'
    ) THEN
        -- Add the column
        ALTER TABLE memento_employees
        ADD COLUMN email_enabled BOOLEAN;

        RAISE NOTICE 'Column email_enabled added successfully';
    ELSE
        RAISE NOTICE 'Column email_enabled already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'memento_employees'
  AND column_name IN ('email', 'email_enabled')
ORDER BY column_name;
