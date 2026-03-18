-- View latest sync logs from PostgreSQL

-- Latest 10 logs (all libraries)
SELECT
    id,
    library_name,
    sync_timestamp,
    total_entries,
    success_count,
    failed_count,
    ROUND(duration_seconds, 2) as duration_sec,
    created_at
FROM memento_script_logs
ORDER BY created_at DESC
LIMIT 10;

-- Latest log for specific library
-- SELECT * FROM memento_script_logs
-- WHERE library_name = 'Zamestnanci'
-- ORDER BY created_at DESC LIMIT 1;

-- View full log content
-- SELECT log_content FROM memento_script_logs
-- WHERE id = 1;  -- Replace with actual ID

-- Stats by library
-- SELECT
--     library_name,
--     COUNT(*) as sync_count,
--     SUM(total_entries) as total_entries,
--     SUM(success_count) as total_success,
--     SUM(failed_count) as total_failed,
--     MAX(created_at) as last_sync
-- FROM memento_script_logs
-- GROUP BY library_name
-- ORDER BY last_sync DESC;
