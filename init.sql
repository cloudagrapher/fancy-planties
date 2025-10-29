-- Initialize database with Row Level Security
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges to the application user
-- Note: User is created by PostgreSQL container via POSTGRES_USER env var
DO $$
BEGIN
  -- Grant connection and creation privileges
  GRANT ALL PRIVILEGES ON DATABASE fancy_planties TO fancy_planties_user;

  -- Grant usage on public schema
  GRANT ALL ON SCHEMA public TO fancy_planties_user;

  -- Grant privileges on all existing tables
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fancy_planties_user;

  -- Grant privileges on all sequences
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fancy_planties_user;

  -- Grant default privileges for future objects
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fancy_planties_user;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fancy_planties_user;
EXCEPTION WHEN undefined_object THEN
  -- User doesn't exist yet, will be created by PostgreSQL
  RAISE NOTICE 'User fancy_planties_user not found, will be created by PostgreSQL';
END $$;

-- Enable Row Level Security
ALTER DATABASE fancy_planties SET row_security = on;