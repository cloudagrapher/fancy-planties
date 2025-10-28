#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { plantInstances } from '../src/lib/db/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '../.env.local') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function debugCleanup() {
  // Get records the same way the cleanup script does
  const records = await db
    .select()
    .from(plantInstances)
    .where(sql`${plantInstances.images} IS NOT NULL AND jsonb_array_length(${plantInstances.images}) > 0`);

  console.log(`Total records with images: ${records.length}`);

  // Check the first few records
  const sample = records.slice(0, 3);
  for (const record of sample) {
    console.log(`\nRecord ID ${record.id}:`);
    console.log(`  typeof s3_image_keys: ${typeof record.s3ImageKeys}`);
    console.log(`  s3ImageKeys value: ${JSON.stringify(record.s3ImageKeys)}`);
    console.log(`  Is Array: ${Array.isArray(record.s3ImageKeys)}`);
    console.log(`  Length check: ${record.s3ImageKeys && record.s3ImageKeys.length > 0}`);

    // Also check with underscore notation
    console.log(`  record.s3_image_keys: ${JSON.stringify((record as any).s3_image_keys)}`);
  }

  await pool.end();
}

debugCleanup().catch(console.error);