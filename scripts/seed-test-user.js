#!/usr/bin/env node

/**
 * Seed script to create a test user for development
 *
 * ⚠️  WARNING: This script is for DEVELOPMENT and TESTING only!
 * ⚠️  DO NOT run this script in production environments!
 *
 * Usage: node scripts/seed-test-user.js
 *
 * This script creates a test user with known credentials.
 * Make sure to delete this user before deploying to production.
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

// Prevent running in production
if (process.env.NODE_ENV === 'production') {
  console.error('❌ ERROR: This seed script cannot be run in production!');
  console.error('This script creates test users with known weak credentials.');
  process.exit(1);
}

// Warn if running in non-development environment
if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
  console.warn('⚠️  WARNING: Running seed script in non-development environment');
  console.warn(`Current NODE_ENV: ${process.env.NODE_ENV}`);
}

async function createTestUser() {
  // Require DATABASE_URL to be explicitly set
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is required');
    console.error('Please set DATABASE_URL in your .env.local file');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🌱 Connected to database');

    // Check if test user already exists
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', ['test@example.com']);
    
    if (existingUser.rows.length > 0) {
      console.log('✅ Test user already exists: test@example.com');
      return;
    }

    // Get test password from environment or use default
    const testPassword = process.env.TEST_USER_PASSWORD || 'password123';

    if (!process.env.TEST_USER_PASSWORD) {
      console.warn('⚠️  WARNING: Using default test password. Set TEST_USER_PASSWORD in .env.local for custom password.');
    }

    // Create test user
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    const result = await client.query(
      'INSERT INTO users (email, hashed_password, name) VALUES ($1, $2, $3) RETURNING id',
      ['test@example.com', hashedPassword, 'Test User']
    );

    console.log('✅ Test user created successfully!');
    console.log('📧 Email: test@example.com');
    console.log(`🔑 Password: ${testPassword}`);
    console.log(`👤 User ID: ${result.rows[0].id}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Delete this user before deploying to production!');

  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  createTestUser();
}