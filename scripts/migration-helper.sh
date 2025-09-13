#!/bin/bash

# Migration Helper Script for Fancy Planties
# This script helps you run database migration commands in Docker containers
# without needing Node.js/npm installed on the host system.

set -e

COMPOSE_FILE="docker-compose.prod.yml"
MIGRATION_SERVICE="migration-utils"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print usage
usage() {
    echo -e "${BLUE}Fancy Planties Migration Helper${NC}"
    echo
    echo "Usage: $0 [command]"
    echo
    echo "Commands:"
    echo "  generate    - Generate new migration files from schema changes"
    echo "  migrate     - Apply pending migrations to database"
    echo "  status      - Check migration status"
    echo "  shell       - Open shell in migration container"
    echo "  up          - Start migration container"
    echo "  down        - Stop migration container"
    echo
    echo "Examples:"
    echo "  $0 generate"
    echo "  $0 migrate"
    echo "  $0 shell"
}

# Check if docker compose is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed or not in PATH${NC}"
        exit 1
    fi

    if ! docker compose version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not available${NC}"
        exit 1
    fi
}

# Start the migration container
start_migration_container() {
    echo -e "${YELLOW}🚀 Starting migration container...${NC}"
    docker compose -f "$COMPOSE_FILE" --profile migration up -d "$MIGRATION_SERVICE"

    # Wait for container to be ready
    echo -e "${YELLOW}⏳ Waiting for container to be ready...${NC}"
    sleep 3

    # Check if container is running
    if ! docker compose -f "$COMPOSE_FILE" ps "$MIGRATION_SERVICE" | grep -q "running"; then
        echo -e "${RED}❌ Failed to start migration container${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Migration container is ready${NC}"
}

# Stop the migration container
stop_migration_container() {
    echo -e "${YELLOW}🛑 Stopping migration container...${NC}"
    docker compose -f "$COMPOSE_FILE" --profile migration down "$MIGRATION_SERVICE"
    echo -e "${GREEN}✅ Migration container stopped${NC}"
}

# Execute command in migration container
exec_in_container() {
    local cmd="$1"
    echo -e "${BLUE}🔧 Executing: $cmd${NC}"
    docker compose -f "$COMPOSE_FILE" exec "$MIGRATION_SERVICE" sh -c "$cmd"
}

# Check if migration container is running
is_container_running() {
    docker compose -f "$COMPOSE_FILE" ps "$MIGRATION_SERVICE" 2>/dev/null | grep -q "running"
}

# Main command handler
case "${1:-}" in
    generate)
        check_docker
        if ! is_container_running; then
            start_migration_container
        fi

        echo -e "${YELLOW}📝 Generating migration files...${NC}"
        exec_in_container "npm run db:generate"
        echo -e "${GREEN}✅ Migration generation complete${NC}"
        echo -e "${YELLOW}💡 Don't forget to commit the new migration files to git${NC}"
        ;;

    migrate)
        check_docker
        if ! is_container_running; then
            start_migration_container
        fi

        echo -e "${YELLOW}🚀 Applying migrations...${NC}"
        exec_in_container "npm run db:migrate"
        echo -e "${GREEN}✅ Migrations applied successfully${NC}"
        ;;

    status)
        check_docker
        if ! is_container_running; then
            start_migration_container
        fi

        echo -e "${YELLOW}📊 Checking migration status...${NC}"
        exec_in_container "npm run db:studio -- --host 0.0.0.0 --port 4983 &"
        echo -e "${GREEN}📋 Drizzle Studio started on port 4983${NC}"
        echo -e "${YELLOW}💡 You can also check the drizzle/ directory for migration files${NC}"
        ;;

    shell)
        check_docker
        if ! is_container_running; then
            start_migration_container
        fi

        echo -e "${YELLOW}🐚 Opening shell in migration container...${NC}"
        docker compose -f "$COMPOSE_FILE" exec "$MIGRATION_SERVICE" sh
        ;;

    up)
        check_docker
        start_migration_container
        ;;

    down)
        check_docker
        stop_migration_container
        ;;

    *)
        usage
        exit 1
        ;;
esac