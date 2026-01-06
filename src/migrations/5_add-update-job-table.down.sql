DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'jobs_set_updated_at') THEN
    DROP TRIGGER jobs_set_updated_at ON jobs;
  END IF;
END
$$;
