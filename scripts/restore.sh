#!/bin/bash

# Fancy Planties Database Restore Script
# This script restores the PostgreSQL database from a backup file

set -e  # Exit on any error

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-fancy_planties}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

# Function to show usage
show_usage() {
  echo "Usage: $0 [backup_file]"
  echo ""
  echo "Options:"
  echo "  backup_file    Path to the backup file (optional)"
  echo "                 If not provided, will use the latest backup"
  echo ""
  echo "Environment variables:"
  echo "  BACKUP_DIR     Directory containing backups (default: /backups)"
  echo "  POSTGRES_HOST  PostgreSQL host (default: localhost)"
  echo "  POSTGRES_PORT  PostgreSQL port (default: 5432)"
  echo "  POSTGRES_DB    Database name (default: fancy_planties)"
  echo "  POSTGRES_USER  PostgreSQL user (default: postgres)"
  echo ""
  echo "Examples:"
  echo "  $0                                    # Restore from latest backup"
  echo "  $0 /path/to/backup.sql.gz            # Restore from specific file"
}

# Parse command line arguments
BACKUP_FILE="$1"

if [ "$BACKUP_FILE" = "-h" ] || [ "$BACKUP_FILE" = "--help" ]; then
  show_usage
  exit 0
fi

# If no backup file specified, find the latest one
if [ -z "$BACKUP_FILE" ]; then
  echo "No backup file specified, looking for latest backup..."
  BACKUP_FILE=$(find "$BACKUP_DIR" -name "fancy_planties_backup_*.sql.gz" -type f | sort | tail -1)
  
  if [ -z "$BACKUP_FILE" ]; then
    echo "ERROR: No backup files found in $BACKUP_DIR"
    echo "Please specify a backup file or ensure backups exist."
    exit 1
  fi
  
  echo "Using latest backup: $BACKUP_FILE"
fi

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Confirm restore operation
echo "WARNING: This will completely replace the current database!"
echo "Database: $POSTGRES_DB"
echo "Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "Starting database restore..."

# Create temporary directory for decompression
TEMP_DIR=$(mktemp -d)
TEMP_SQL_FILE="$TEMP_DIR/restore.sql"

# Decompress backup file
echo "Decompressing backup file..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" > "$TEMP_SQL_FILE"
else
  cp "$BACKUP_FILE" "$TEMP_SQL_FILE"
fi

# Verify decompressed file
if [ ! -f "$TEMP_SQL_FILE" ]; then
  echo "ERROR: Failed to decompress backup file!"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Stop application if running (optional)
echo "Note: Make sure the application is stopped before restoring!"

# Restore database
echo "Restoring database..."
psql \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="postgres" \
  --quiet \
  --file="$TEMP_SQL_FILE"

# Clean up temporary files
rm -rf "$TEMP_DIR"

# Verify restore
echo "Verifying restore..."
TABLE_COUNT=$(psql \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --tuples-only \
  --command="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [ "$TABLE_COUNT" -gt 0 ]; then
  echo "Restore completed successfully!"
  echo "Tables restored: $TABLE_COUNT"
else
  echo "WARNING: Restore may have failed - no tables found in database"
  exit 1
fi

echo "Database restore process completed!"
echo "Remember to restart the application if it was stopped."