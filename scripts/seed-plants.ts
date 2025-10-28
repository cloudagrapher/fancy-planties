#!/usr/bin/env tsx

import { readFileSync, existsSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { drizzle } from 'drizzle-orm/postgres-js';
import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { eq, and, isNull } from 'drizzle-orm';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Define the plants table schema directly (avoiding server-only imports)
const plants = pgTable('plants', {
  id: serial('id').primaryKey(),
  family: text('family').notNull(),
  genus: text('genus').notNull(),
  species: text('species').notNull(),
  cultivar: text('cultivar'),
  commonName: text('common_name').notNull(),
  careInstructions: text('care_instructions'),
  defaultImage: text('default_image'),
  createdBy: serial('created_by'),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Load environment configuration similar to drizzle.config.ts
function loadEnvironmentConfig() {
  // Check for explicit environment variable
  const environment = process.env.DRIZZLE_ENV || process.env.NODE_ENV;

  // Define environment file priority
  const envFiles = [
    environment === 'production' ? '.env.prod' : null,
    environment === 'local' || environment === 'development' ? '.env.local' : null,
    '.env', // fallback
  ].filter(Boolean) as string[];

  // Load the first existing environment file
  for (const envFile of envFiles) {
    if (existsSync(envFile)) {
      console.log(`🔧 Loading seeding config from: ${envFile}`);
      dotenv.config({ path: envFile, override: true });
      break;
    }
  }

  // Fallback to default if no DATABASE_URL is found
  return process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fancy_planties';
}

// Create database connection
const connectionString = loadEnvironmentConfig();
console.log(`🔌 Connecting to database: ${connectionString.replace(/\/\/[^@]+@/, '//***:***@')}`);
const sql = postgres(connectionString);
const db = drizzle(sql);

interface PlantRow {
  Family: string;
  Genus: string;
  Species: string;
  Cultivar: string;
  'Common Name/Variety': string;
  Location: string;
  'Last Fertilized': string;
  'Fertilizer Schedule': string;
  'Fertilizer Due': string;
  'Last Repot': string;
}

async function seedPlants() {
  try {
    console.log('🌱 Starting plant taxonomy seeding...');

    // Read and parse CSV file
    const csvContent = readFileSync('Plant Spreadsheet for Upload - Sheet1 - Cleaned.csv', 'utf-8');
    const records: PlantRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    });

    console.log(`📊 Found ${records.length} plant records in CSV`);

    // Process each record
    const uniquePlants = new Map<string, any>();

    for (const record of records) {
      const family = record.Family?.trim();
      const genus = record.Genus?.trim();
      const species = record.Species?.trim();
      const cultivar = record.Cultivar?.trim() || null;
      const commonName = record['Common Name/Variety']?.trim();

      if (!family || !genus || !species || !commonName) {
        console.log(`⚠️  Skipping incomplete record: ${JSON.stringify(record)}`);
        continue;
      }

      // Create unique key for plant taxonomy
      const key = `${family}-${genus}-${species}-${cultivar || 'null'}`;
      
      if (!uniquePlants.has(key)) {
        uniquePlants.set(key, {
          family,
          genus,
          species,
          cultivar,
          commonName,
          isVerified: true, // Mark seed data as verified
          createdBy: null, // System created
        });
      }
    }

    console.log(`🔍 Found ${uniquePlants.size} unique plant taxonomies`);

    // Insert plants into database
    let insertedCount = 0;
    let skippedCount = 0;

    for (const [key, plantData] of uniquePlants) {
      try {
        // Check if plant already exists
        const existing = await db
          .select()
          .from(plants)
          .where(
            and(
              eq(plants.family, plantData.family),
              eq(plants.genus, plantData.genus),
              eq(plants.species, plantData.species),
              plantData.cultivar 
                ? eq(plants.cultivar, plantData.cultivar)
                : isNull(plants.cultivar)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          console.log(`⏭️  Plant already exists: ${plantData.commonName}`);
          skippedCount++;
          continue;
        }

        // Insert new plant
        await db.insert(plants).values(plantData);
        console.log(`✅ Inserted: ${plantData.commonName} (${plantData.family} ${plantData.genus} ${plantData.species}${plantData.cultivar ? ` '${plantData.cultivar}'` : ''})`);
        insertedCount++;

      } catch (error) {
        console.error(`❌ Failed to insert ${plantData.commonName}:`, error);
      }
    }

    console.log('\n🎉 Seeding completed!');
    console.log(`✅ Inserted: ${insertedCount} plants`);
    console.log(`⏭️  Skipped: ${skippedCount} plants (already exist)`);
    console.log(`📊 Total processed: ${uniquePlants.size} unique taxonomies`);

    // Show some examples of what was inserted
    console.log('\n📋 Sample of inserted plants:');
    const samplePlants = await db
      .select()
      .from(plants)
      .orderBy(plants.createdAt)
      .limit(5);

    samplePlants.forEach(plant => {
      console.log(`   • ${plant.commonName} (${plant.family} ${plant.genus} ${plant.species}${plant.cultivar ? ` '${plant.cultivar}'` : ''})`);
    });

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await sql.end();
  }
}

// Run the seeding
seedPlants()
  .then(() => {
    console.log('\n🌟 Plant seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });