#!/usr/bin/env node

/**
 * Seed script to create a test user for development
 * Usage: node scripts/seed-test-user.js
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function createTestUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:simple_password_123@localhost:5432/fancy_planties'
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

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 12);
    const result = await client.query(
      'INSERT INTO users (email, hashed_password, name) VALUES ($1, $2, $3) RETURNING id',
      ['test@example.com', hashedPassword, 'Test User']
    );

    console.log('✅ Test user created successfully!');
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: password123');
    console.log(`👤 User ID: ${result.rows[0].id}`);

  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  createTestUser();
}