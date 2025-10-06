CREATE TABLE IF NOT EXISTS tasks_jobs (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL,
    job_id BIGINT NOT NULL,
    position INTEGER NOT NULL DEFAULT 1 CHECK (position > 0),
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_tasks_jobs_task'
  ) THEN
    ALTER TABLE tasks_jobs
      ADD CONSTRAINT fk_tasks_jobs_task
      FOREIGN KEY (task_id) REFERENCES tasks(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_tasks_jobs_job'
  ) THEN
    ALTER TABLE tasks_jobs
      ADD CONSTRAINT fk_tasks_jobs_job
      FOREIGN KEY (job_id) REFERENCES jobs(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ux_tasks_jobs_task_job'
  ) THEN
    ALTER TABLE tasks_jobs
      ADD CONSTRAINT ux_tasks_jobs_task_job UNIQUE (task_id, job_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ux_tasks_jobs_task_position'
  ) THEN
    ALTER TABLE tasks_jobs
      ADD CONSTRAINT ux_tasks_jobs_task_position UNIQUE (task_id, position);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tasks_jobs_set_updated_at') THEN
    CREATE TRIGGER tasks_jobs_set_updated_at
    BEFORE UPDATE ON tasks_jobs
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_jobs_task ON tasks_jobs (task_id, position);

CREATE INDEX IF NOT EXISTS idx_tasks_jobs_job ON tasks_jobs (job_id);
