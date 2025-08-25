CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('fixed', 'deadman')),
  is_single_time_only BOOLEAN NOT NULL DEFAULT TRUE,
  type TEXT NOT NULL CHECK (type IN ('monthly', 'weekly', 'daily', 'hourly')),
  days INTEGER[],
  minutes INTEGER[],
  hours INTEGER[],
  jump INTEGER[] created_at TIMESTAMP DEFAULT NOW()
);
