CREATE TABLE IF NOT EXISTS job_runs (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT REFERENCES jobs (id) ON DELETE SET NULL,
    task_id BIGINT REFERENCES tasks (id) ON DELETE SET NULL,
    config_snapshot JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ok', 'failed', 'aborted')),
    error_message TEXT,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS job_runs_job_id_idx ON job_runs (job_id);

CREATE INDEX IF NOT EXISTS job_runs_created_at_idx ON job_runs (created_at);

CREATE INDEX IF NOT EXISTS job_runs_job_id_status_idx ON job_runs (job_id, status);

CREATE INDEX IF NOT EXISTS job_runs_job_id_created_at_idx ON job_runs (job_id, created_at);
