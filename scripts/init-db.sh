#!/bin/bash

# Database initialization script for Planty Tracker
# This script applies all Drizzle migrations and sets up the database

set -e

echo "🌱 Initializing Planty Tracker database..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until pg_isready -h ${POSTGRES_HOST:-postgres} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-postgres}; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Apply initial setup (extensions, etc.)
echo "🔧 Setting up database extensions..."
if [ -f "/docker-entrypoint-initdb.d/init.sql" ]; then
  psql -h ${POSTGRES_HOST:-postgres} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-fancy_planties} -f /docker-entrypoint-initdb.d/init.sql
fi

# Create drizzle migration tracking schema
echo "📊 Setting up migration tracking..."
psql -h ${POSTGRES_HOST:-postgres} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-fancy_planties} -c "
  CREATE SCHEMA IF NOT EXISTS drizzle;
  CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  );
"

# Apply all migrations in order
echo "🚀 Applying database migrations..."
MIGRATION_DIR="/app/drizzle"

if [ -d "$MIGRATION_DIR" ]; then
  for migration_file in "$MIGRATION_DIR"/*.sql; do
    if [ -f "$migration_file" ] && [[ $(basename "$migration_file") =~ ^[0-9]{4}_.+\.sql$ ]]; then
      echo "  📋 Applying $(basename "$migration_file")..."
      psql -h ${POSTGRES_HOST:-postgres} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-fancy_planties} -f "$migration_file"
    fi
  done
  
  # Apply RLS policies if they exist
  if [ -f "$MIGRATION_DIR/rls-policies.sql" ]; then
    echo "  🔒 Applying RLS policies..."
    psql -h ${POSTGRES_HOST:-postgres} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-fancy_planties} -f "$MIGRATION_DIR/rls-policies.sql"
  fi
else
  echo "❌ Migration directory not found: $MIGRATION_DIR"
  exit 1
fi

echo "✅ Database initialization complete!"

# Grant ownership and permissions to application user if different from migration user
if [ "${POSTGRES_USER}" != "postgres" ]; then
  echo "🔐 Granting permissions to ${POSTGRES_USER}..."
  psql -h ${POSTGRES_HOST:-postgres} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-fancy_planties} -c "
    -- Grant all privileges on database
    GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB:-fancy_planties} TO ${POSTGRES_USER};

    -- Grant schema privileges
    GRANT ALL ON SCHEMA public TO ${POSTGRES_USER};
    GRANT ALL ON SCHEMA drizzle TO ${POSTGRES_USER};

    -- Grant privileges on all tables
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${POSTGRES_USER};
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA drizzle TO ${POSTGRES_USER};

    -- Grant privileges on all sequences
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${POSTGRES_USER};
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA drizzle TO ${POSTGRES_USER};

    -- Set default privileges for future objects
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${POSTGRES_USER};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${POSTGRES_USER};
    ALTER DEFAULT PRIVILEGES IN SCHEMA drizzle GRANT ALL ON TABLES TO ${POSTGRES_USER};
    ALTER DEFAULT PRIVILEGES IN SCHEMA drizzle GRANT ALL ON SEQUENCES TO ${POSTGRES_USER};
  "
  echo "✅ Permissions granted to ${POSTGRES_USER}"
fi

# Verify tables were created
echo "🔍 Verifying database setup..."
table_count=$(psql -h ${POSTGRES_HOST:-postgres} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-fancy_planties} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")

if [ "$table_count" -gt 0 ]; then
  echo "✅ Database setup verified: $table_count tables created"
  psql -h ${POSTGRES_HOST:-postgres} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-fancy_planties} -c "\dt"
else
  echo "❌ No tables found - migration may have failed"
  exit 1
fi

echo "🎉 Database is ready for Planty Tracker!"