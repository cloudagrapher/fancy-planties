#!/bin/bash

# Fancy Planties Deployment Script
# Usage: ./deploy.sh [server-ip]

SERVER_IP=${1:-192.168.50.18}
COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Deploying Fancy Planties to $SERVER_IP..."

# Copy latest docker-compose.prod.yml
echo "📋 Copying production compose file..."
scp $COMPOSE_FILE root@$SERVER_IP:/mnt/user/appdata/fancy-planties/

# Deploy on server
echo "🐳 Pulling latest images and restarting services..."
ssh root@$SERVER_IP "cd /mnt/user/appdata/fancy-planties && \
  docker compose -f $COMPOSE_FILE pull && \
  docker compose -f $COMPOSE_FILE up -d"

# Check health
echo "🩺 Checking application health..."
sleep 5
HEALTH_STATUS=$(curl -s http://$SERVER_IP:3000/api/health | jq -r '.status' 2>/dev/null || echo "unknown")

if [ "$HEALTH_STATUS" = "healthy" ]; then
  echo "✅ Deployment successful! Application is healthy."
  echo "🌐 Access your app at: http://$SERVER_IP:3000"
else
  echo "⚠️  Deployment completed but health check failed. Check logs:"
  echo "   docker logs fancy-planties-app-prod"
fi

echo "🎉 Deployment complete!"