#!/bin/bash

# Fancy Planties Production Deployment Script
# This script handles the complete production deployment process

set -e  # Exit on any error

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-true}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-60}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required tools are installed
check_prerequisites() {
  log_info "Checking prerequisites..."
  
  local missing_tools=()
  
  if ! command -v docker &> /dev/null; then
    missing_tools+=("docker")
  fi
  
  if ! command -v docker-compose &> /dev/null; then
    missing_tools+=("docker-compose")
  fi
  
  if [ ${#missing_tools[@]} -ne 0 ]; then
    log_error "Missing required tools: ${missing_tools[*]}"
    log_error "Please install the missing tools and try again."
    exit 1
  fi
  
  log_success "All prerequisites are installed"
}

# Function to validate environment file
validate_environment() {
  log_info "Validating environment configuration..."
  
  local env_file=".env.${ENVIRONMENT}"
  
  if [ ! -f "$env_file" ]; then
    log_error "Environment file not found: $env_file"
    log_error "Please create the environment file with required variables."
    exit 1
  fi
  
  # Check for required variables
  local required_vars=("POSTGRES_PASSWORD" "NEXT_PUBLIC_APP_URL")
  local missing_vars=()
  
  for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" "$env_file"; then
      missing_vars+=("$var")
    fi
  done
  
  if [ ${#missing_vars[@]} -ne 0 ]; then
    log_error "Missing required environment variables: ${missing_vars[*]}"
    log_error "Please add them to $env_file"
    exit 1
  fi
  
  log_success "Environment configuration is valid"
}

# Function to create backup before deployment
create_backup() {
  if [ "$BACKUP_BEFORE_DEPLOY" = "true" ]; then
    log_info "Creating backup before deployment..."
    
    if [ -f "scripts/backup.sh" ]; then
      ./scripts/backup.sh
      log_success "Backup created successfully"
    else
      log_warning "Backup script not found, skipping backup"
    fi
  else
    log_info "Skipping backup (BACKUP_BEFORE_DEPLOY=false)"
  fi
}

# Function to build and deploy the application
deploy_application() {
  log_info "Building and deploying application..."
  
  # Load environment variables
  export $(grep -v '^#' ".env.${ENVIRONMENT}" | xargs)
  
  # Build and start services
  docker-compose -f docker-compose.prod.yml --env-file ".env.${ENVIRONMENT}" up -d --build
  
  log_success "Application deployed successfully"
}

# Function to run database migrations
run_migrations() {
  if [ "$RUN_MIGRATIONS" = "true" ]; then
    log_info "Running database migrations..."
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    sleep 10
    
    # Run migrations using the app container
    docker-compose -f docker-compose.prod.yml exec -T app npm run db:migrate
    
    log_success "Database migrations completed"
  else
    log_info "Skipping migrations (RUN_MIGRATIONS=false)"
  fi
}

# Function to perform health checks
health_check() {
  log_info "Performing health checks..."
  
  local app_url="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
  local health_endpoint="${app_url}/api/health"
  local timeout=$HEALTH_CHECK_TIMEOUT
  local interval=5
  local elapsed=0
  
  log_info "Checking health endpoint: $health_endpoint"
  
  while [ $elapsed -lt $timeout ]; do
    if curl -f -s "$health_endpoint" > /dev/null 2>&1; then
      log_success "Health check passed"
      return 0
    fi
    
    log_info "Health check failed, retrying in ${interval}s... (${elapsed}/${timeout}s elapsed)"
    sleep $interval
    elapsed=$((elapsed + interval))
  done
  
  log_error "Health check failed after ${timeout}s timeout"
  return 1
}

# Function to show deployment status
show_status() {
  log_info "Deployment Status:"
  echo ""
  
  # Show running containers
  log_info "Running containers:"
  docker-compose -f docker-compose.prod.yml ps
  echo ""
  
  # Show application logs (last 20 lines)
  log_info "Recent application logs:"
  docker-compose -f docker-compose.prod.yml logs --tail=20 app
  echo ""
  
  # Show resource usage
  log_info "Resource usage:"
  docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
}

# Function to rollback deployment
rollback() {
  log_warning "Rolling back deployment..."
  
  # Stop current deployment
  docker-compose -f docker-compose.prod.yml down
  
  # Restore from backup if available
  if [ -f "scripts/restore.sh" ]; then
    log_info "Restoring from backup..."
    ./scripts/restore.sh
  else
    log_warning "Restore script not found, manual database restore may be required"
  fi
  
  log_warning "Rollback completed. Please verify the system state."
}

# Main deployment function
main() {
  log_info "Starting production deployment for Fancy Planties"
  log_info "Environment: $ENVIRONMENT"
  echo ""
  
  # Confirm deployment
  read -p "Are you sure you want to deploy to $ENVIRONMENT? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    log_info "Deployment cancelled"
    exit 0
  fi
  
  # Run deployment steps
  check_prerequisites
  validate_environment
  create_backup
  deploy_application
  
  # Wait a moment for services to start
  sleep 15
  
  run_migrations
  
  # Perform health checks
  if health_check; then
    log_success "Deployment completed successfully!"
    show_status
  else
    log_error "Deployment failed health checks"
    log_warning "Consider rolling back the deployment"
    
    read -p "Do you want to rollback? (yes/no): " ROLLBACK_CONFIRM
    if [ "$ROLLBACK_CONFIRM" = "yes" ]; then
      rollback
    fi
    
    exit 1
  fi
}

# Handle script arguments
case "${1:-}" in
  "rollback")
    rollback
    ;;
  "status")
    show_status
    ;;
  "health")
    health_check
    ;;
  *)
    main
    ;;
esac