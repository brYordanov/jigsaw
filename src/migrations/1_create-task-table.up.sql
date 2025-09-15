DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_type_enum') THEN
    CREATE TYPE schedule_type_enum AS ENUM ('fixed', 'deadman');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interval_type_enum') THEN
    CREATE TYPE interval_type_enum AS ENUM ('monthly', 'weekly', 'daily', 'hourly');
  END IF;
END 
$$;

CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_single_time_only BOOLEAN NOT NULL DEFAULT TRUE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    schedule_type schedule_type_enum NOT NULL,
    interval_type interval_type_enum NOT NULL,
    days_of_month INTEGER[],
    days_of_week INTEGER[],
    hours INTEGER[],
    minutes INTEGER[],
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    timeout_seconds INTEGER,
    last_ping_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        timeout_seconds IS NULL
        OR timeout_seconds > 0
    )
);

CREATE INDEX IF NOT EXISTS idx_tasks_next_run_at_is_enabled ON tasks (next_run_at)
WHERE
    is_enabled = TRUE;

CREATE OR REPLACE FUNCTION set_updated_at () RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tasks_set_updated_at') THEN
    CREATE TRIGGER tasks_set_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  END IF;
END
$$;
