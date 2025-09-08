#!/usr/bin/env node

/**
 * Seed script to create development data
 * Usage: node scripts/seed-dev-data.js
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function seedDevData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/fancy_planties'
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
      const hashedPassword = await bcrypt.hash('password123', 12);
      const result = await client.query(
        'INSERT INTO users (email, hashed_password, name) VALUES ($1, $2, $3) RETURNING id',
        ['test@example.com', hashedPassword, 'Test User']
      );
      userId = result.rows[0].id;
      console.log('✅ Test user created successfully!');
      console.log('📧 Email: test@example.com');
      console.log('🔑 Password: password123');
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