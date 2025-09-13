# Database Migration Guide for Unraid Production

This guide explains how to manage database migrations on your Unraid server without needing Node.js/npm installed locally.

## Quick Update

To update your production deployment:

```bash
./docker-update.sh
```

This script will:
- Stop all services
- Pull latest images
- Build migration utilities
- Start services
- Automatically apply any new migrations
- Perform health checks

## Manual Migration Commands

If you need to run migration commands manually:

### Generate New Migration Files

When you make schema changes and need to generate migration files:

```bash
./scripts/migration-helper.sh generate
```

### Apply Migrations

To apply pending migrations:

```bash
./scripts/migration-helper.sh migrate
```

### Check Migration Status

```bash
./scripts/migration-helper.sh status
```

### Access Migration Shell

For advanced operations:

```bash
./scripts/migration-helper.sh shell
```

### Start/Stop Migration Container

```bash
# Start the migration container
./scripts/migration-helper.sh up

# Stop the migration container
./scripts/migration-helper.sh down
```

## How It Works

### Production Architecture

1. **Main App Container**: Runs the Next.js application (read-only)
2. **Database Container**: PostgreSQL with automatic initialization
3. **Migration Utils Container**: Node.js environment with Drizzle tools (on-demand)

### Migration Files

- Located in `./drizzle/` directory
- Applied automatically during startup via `init-db.sh`
- New migrations detected and applied during updates

### Key Files

- `docker-compose.prod.yml`: Production services configuration
- `Dockerfile.migration`: Migration utilities container
- `scripts/migration-helper.sh`: Migration command wrapper
- `scripts/init-db.sh`: Database initialization script
- `docker-update.sh`: Production update script

## Common Workflows

### Adding a New Table/Column

1. Modify your schema in `src/lib/db/schema.ts`
2. Generate migration: `./scripts/migration-helper.sh generate`
3. Commit the new migration files
4. Deploy: `./docker-update.sh`

### Troubleshooting

#### Migration Fails

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs migration-utils

# Access migration shell for debugging
./scripts/migration-helper.sh shell
```

#### Database Connection Issues

```bash
# Check database status
docker compose -f docker-compose.prod.yml ps postgres

# View database logs
docker compose -f docker-compose.prod.yml logs postgres
```

#### Reset Everything

```bash
# Stop all services
docker compose -f docker-compose.prod.yml down

# Remove volumes (⚠️ DATA LOSS)
docker volume prune

# Restart
./docker-update.sh
```

## Security Notes

- Migration container only runs when needed (profile-based)
- Uses read-only volumes where possible
- Runs as non-root user (nextjs:nodejs)
- Database uses health checks and proper networking