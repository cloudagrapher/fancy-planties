#!/bin/bash

# Docker Update Script for Fancy Planties Production
# This script updates the production deployment on Unraid

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Fancy Planties Production Update${NC}"
echo

# Use production compose file
COMPOSE_FILE="docker-compose.prod.yml"

# Stop all services
echo -e "${YELLOW}🛑 Stopping all services...${NC}"
docker compose -f "$COMPOSE_FILE" down

# Pull latest images
echo -e "${YELLOW}📥 Pulling latest images...${NC}"
docker compose -f "$COMPOSE_FILE" pull

# # Build migration utils if needed
echo -e "${YELLOW}🔨 Building migration utilities...${NC}"
docker compose -f "$COMPOSE_FILE" --profile migration build db-migrate

# Start core services (postgres and app)
echo -e "${YELLOW}🚀 Starting core services...${NC}"
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
timeout 120 docker compose -f "$COMPOSE_FILE" wait postgres app

# Check if any new migrations need to be applied
echo -e "${YELLOW}📊 Checking for pending migrations...${NC}"
if [ -d "./drizzle" ] && [ "$(find ./drizzle -name "*.sql" -newer ./scripts/.last-migration 2>/dev/null | wc -l)" -gt 0 ]; then
    echo -e "${YELLOW}🔄 New migrations found, applying...${NC}"

    # Start migration container temporarily
    docker compose -f "$COMPOSE_FILE" --profile migration up -d db-migrate

    # Wait for migration container
    sleep 5

    # Apply migrations
    docker compose -f "$COMPOSE_FILE" exec db-migrate npm run db:migrate

    # Stop migration container
    docker compose -f "$COMPOSE_FILE" --profile migration down db-migrate

    # Touch file to track last migration
    mkdir -p ./scripts
    touch ./scripts/.last-migration

    echo -e "${GREEN}✅ Migrations applied successfully${NC}"
else
    echo -e "${GREEN}✅ No new migrations to apply${NC}"
fi

# Final health check
echo -e "${YELLOW}🏥 Performing final health check...${NC}"
if docker compose -f "$COMPOSE_FILE" ps | grep -q "healthy\|running"; then
    echo -e "${GREEN}✅ Update completed successfully!${NC}"
    echo
    echo -e "${BLUE}📋 Service Status:${NC}"
    docker compose -f "$COMPOSE_FILE" ps
    echo
    echo -e "${BLUE}💡 Useful commands:${NC}"
    echo -e "  View logs: ${YELLOW}docker compose -f $COMPOSE_FILE logs -f app${NC}"
    echo -e "  Migration commands: ${YELLOW}./scripts/migration-helper.sh${NC}"
    echo -e "  Restart services: ${YELLOW}docker compose -f $COMPOSE_FILE restart${NC}"
else
    echo -e "${RED}❌ Update failed - services are not healthy${NC}"
    docker compose -f "$COMPOSE_FILE" logs --tail=50
    exit 1
fi
