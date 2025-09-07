#!/bin/bash

# Fancy Planties Database Backup Script
# This script creates automated backups of the PostgreSQL database

set -e  # Exit on any error

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-fancy_planties}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/fancy_planties_backup_$TIMESTAMP.sql"
BACKUP_FILE_COMPRESSED="$BACKUP_FILE.gz"

echo "Starting database backup..."
echo "Database: $POSTGRES_DB"
echo "Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "Backup file: $BACKUP_FILE_COMPRESSED"

# Create database dump
pg_dump \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --no-password \
  --verbose \
  --clean \
  --if-exists \
  --create \
  --format=plain \
  --file="$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_FILE"

# Verify backup was created
if [ -f "$BACKUP_FILE_COMPRESSED" ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE_COMPRESSED" | cut -f1)
  echo "Backup completed successfully!"
  echo "Backup size: $BACKUP_SIZE"
  echo "Backup location: $BACKUP_FILE_COMPRESSED"
else
  echo "ERROR: Backup file was not created!"
  exit 1
fi

# Clean up old backups (keep only last N days)
echo "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "fancy_planties_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# List remaining backups
echo "Current backups:"
ls -lh "$BACKUP_DIR"/fancy_planties_backup_*.sql.gz 2>/dev/null || echo "No backups found"

echo "Backup process completed!"