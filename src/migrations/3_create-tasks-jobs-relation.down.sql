DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tasks_jobs_set_updated_at') THEN
    DROP TRIGGER tasks_jobs_set_updated_at ON tasks_jobs;
  END IF;
END $$;

DROP TABLE IF EXISTS tasks_jobs;
