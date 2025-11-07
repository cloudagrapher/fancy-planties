#!/usr/bin/env node

/**
 * Seed script to create development data
 *
 * ⚠️  WARNING: This script is for DEVELOPMENT and TESTING only!
 * ⚠️  DO NOT run this script in production environments!
 *
 * Usage: node scripts/seed-dev-data.js
 *
 * This script creates test users with known credentials and sample plant data.
 * Make sure to delete test data before deploying to production.
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

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

async function seedDevData() {
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

    // Create test user if it doesn't exist
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', ['test@example.com']);
    
    let userId;
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      console.log('✅ Test user already exists: test@example.com');
    } else {
      // Get test password from environment or use default
      const testPassword = process.env.TEST_USER_PASSWORD || 'password123';

      if (!process.env.TEST_USER_PASSWORD) {
        console.warn('⚠️  WARNING: Using default test password. Set TEST_USER_PASSWORD in .env.local for custom password.');
      }

      const hashedPassword = await bcrypt.hash(testPassword, 12);
      const result = await client.query(
        'INSERT INTO users (email, hashed_password, name) VALUES ($1, $2, $3) RETURNING id',
        ['test@example.com', hashedPassword, 'Test User']
      );
      userId = result.rows[0].id;
      console.log('✅ Test user created successfully!');
      console.log('📧 Email: test@example.com');
      console.log(`🔑 Password: ${testPassword}`);
      console.log('⚠️  IMPORTANT: Delete this user before deploying to production!');
    }

    // Check if we already have plant data
    const plantCount = await client.query('SELECT COUNT(*) as count FROM plants');
    
    if (Number(plantCount.rows[0].count) > 0) {
      console.log('✅ Plant data already exists');
      return;
    }

    // Add common plant taxonomy data
    const commonPlants = [
      {
        family: 'Araceae',
        genus: 'Monstera',
        species: 'deliciosa',
        commonName: 'Swiss Cheese Plant',
        careInstructions: 'Bright indirect light, water when top inch of soil is dry',
        isVerified: true
      },
      {
        family: 'Araceae',
        genus: 'Pothos',
        species: 'aureus',
        commonName: 'Golden Pothos',
        careInstructions: 'Low to bright indirect light, water when soil is dry',
        isVerified: true
      },
      {
        family: 'Asparagaceae',
        genus: 'Sansevieria',
        species: 'trifasciata',
        commonName: 'Snake Plant',
        careInstructions: 'Low light tolerant, water sparingly',
        isVerified: true
      },
      {
        family: 'Araceae',
        genus: 'Philodendron',
        species: 'hederaceum',
        commonName: 'Heartleaf Philodendron',
        careInstructions: 'Bright indirect light, keep soil lightly moist',
        isVerified: true
      },
      {
        family: 'Moraceae',
        genus: 'Ficus',
        species: 'lyrata',
        commonName: 'Fiddle Leaf Fig',
        careInstructions: 'Bright indirect light, water when top 2 inches of soil are dry',
        isVerified: true
      },
      {
        family: 'Araceae',
        genus: 'Epipremnum',
        species: 'aureum',
        commonName: 'Devils Ivy',
        careInstructions: 'Low to bright indirect light, water when soil is dry',
        isVerified: true
      }
    ];

    console.log('🌿 Seeding plant taxonomy data...');
    
    for (const plant of commonPlants) {
      await client.query(`
        INSERT INTO plants (family, genus, species, cultivar, common_name, care_instructions, is_verified, created_by)
        VALUES ($1, $2, $3, NULL, $4, $5, $6, $7)
        ON CONFLICT (family, genus, species, cultivar) DO NOTHING
      `, [plant.family, plant.genus, plant.species, plant.commonName, plant.careInstructions, plant.isVerified, userId]);
    }

    console.log('✅ Plant taxonomy data seeded successfully!');
    console.log(`📊 Added ${commonPlants.length} plant types`);

  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  seedDevData();
}

module.exports = { seedDevData };