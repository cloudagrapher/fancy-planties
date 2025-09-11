#!/usr/bin/env node

/**
 * Database initialization script for Docker environments
 * This script can be run manually or as part of the Docker setup
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🌱 Planty Tracker Database Initialization');

function runCommand(command, description) {
  console.log(`⚡ ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

function checkDockerCompose() {
  try {
    execSync('docker compose --version', { stdio: 'pipe' });
    return true;
  } catch {
    console.error('❌ Docker Compose is not available');
    return false;
  }
}

function main() {
  const cwd = process.cwd();
  const composePath = path.join(cwd, 'docker-compose.yml');
  
  if (!fs.existsSync(composePath)) {
    console.error('❌ docker-compose.yml not found in current directory');
    process.exit(1);
  }

  if (!checkDockerCompose()) {
    process.exit(1);
  }

  console.log('🔄 Stopping existing containers...');
  runCommand('docker compose down -v', 'Stop containers and remove volumes');
  
  console.log('🚀 Starting fresh database setup...');
  runCommand('docker compose up postgres db-migrate -d', 'Start database and run migrations');
  
  console.log('⏳ Waiting for migration to complete...');
  runCommand('docker compose wait db-migrate', 'Wait for migration completion');
  
  console.log('📋 Checking migration logs...');
  runCommand('docker compose logs db-migrate', 'Show migration logs');
  
  console.log('📧 Setting up email verification...');
  runCommand('npm run db:setup-email-verification', 'Setup email verification schema');
  
  console.log('🎉 Database initialization complete!');
  console.log('💡 You can now start the application with: docker compose up app');
}

if (require.main === module) {
  main();
}