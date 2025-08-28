DROP TRIGGER IF EXISTS tasks_set_updated_at ON tasks;
DROP FUNCTION IF EXISTS set_updated_at();

DROP TABLE IF EXISTS tasks;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_type_enum') THEN
        DROP TYPE schedule_type_enum;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interval_type_enum') THEN
        DROP TYPE interval_type_enum;
    END IF; 
END
$$; 