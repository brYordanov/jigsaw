DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type_enum') THEN
    CREATE TYPE job_type_enum AS ENUM ('http', 'email', 'shell', 'sql', 'healthcheck');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS jobs (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    job_type job_type_enum NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    max_retries INTEGER NOT NULL DEFAULT 3 CHECK (max_retries >= 0),
    retry_backoff_seconds INTEGER NOT NULL DEFAULT 60 CHECK (retry_backoff_seconds >= 0),
    max_concurrency INTEGER NOT NULL DEFAULT 1 CHECK (max_concurrency > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
