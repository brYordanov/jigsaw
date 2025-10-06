DROP TABLE IF EXISTS jobs;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type_enum') THEN
    DROP TYPE job_type_enum;
  END IF;
END $$;
