#!/usr/bin/env tsx

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString });
const db = drizzle(pool);

async function checkMigrationStatus() {
  const result = await db.execute(sql`
    SELECT
      'plant_instances' as table_name,
      COUNT(*) as total,
      COUNT(CASE WHEN images IS NOT NULL THEN 1 END) as with_images_column,
      COUNT(CASE WHEN images IS NOT NULL AND jsonb_array_length(images) > 0 THEN 1 END) as with_actual_images,
      COUNT(CASE WHEN s3_image_keys IS NOT NULL THEN 1 END) as with_s3_column,
      COUNT(CASE WHEN s3_image_keys IS NOT NULL AND jsonb_array_length(s3_image_keys) > 0 THEN 1 END) as with_actual_s3_keys
    FROM plant_instances
    UNION ALL
    SELECT
      'propagations',
      COUNT(*),
      COUNT(CASE WHEN images IS NOT NULL THEN 1 END),
      COUNT(CASE WHEN images IS NOT NULL AND jsonb_array_length(images) > 0 THEN 1 END),
      COUNT(CASE WHEN s3_image_keys IS NOT NULL THEN 1 END),
      COUNT(CASE WHEN s3_image_keys IS NOT NULL AND jsonb_array_length(s3_image_keys) > 0 THEN 1 END)
    FROM propagations
    UNION ALL
    SELECT
      'care_history',
      COUNT(*),
      COUNT(CASE WHEN images IS NOT NULL THEN 1 END),
      COUNT(CASE WHEN images IS NOT NULL AND jsonb_array_length(images) > 0 THEN 1 END),
      COUNT(CASE WHEN s3_image_keys IS NOT NULL THEN 1 END),
      COUNT(CASE WHEN s3_image_keys IS NOT NULL AND jsonb_array_length(s3_image_keys) > 0 THEN 1 END)
    FROM care_history
    UNION ALL
    SELECT
      'care_guides',
      COUNT(*),
      COUNT(CASE WHEN images IS NOT NULL THEN 1 END),
      COUNT(CASE WHEN images IS NOT NULL AND jsonb_array_length(images) > 0 THEN 1 END),
      COUNT(CASE WHEN s3_image_keys IS NOT NULL THEN 1 END),
      COUNT(CASE WHEN s3_image_keys IS NOT NULL AND jsonb_array_length(s3_image_keys) > 0 THEN 1 END)
    FROM care_guides
  `);

  console.log('\n📊 Database Migration Status:');
  console.log('='.repeat(100));
  console.table(result.rows);

  // Check for records with images but no S3 keys
  const unmigratedCheck = await db.execute(sql`
    SELECT
      'plant_instances' as table_name,
      COUNT(*) as unmigrated_count
    FROM plant_instances
    WHERE images IS NOT NULL
    AND (s3_image_keys IS NULL OR jsonb_array_length(s3_image_keys) = 0)
    UNION ALL
    SELECT
      'propagations',
      COUNT(*)
    FROM propagations
    WHERE images IS NOT NULL
    AND (s3_image_keys IS NULL OR jsonb_array_length(s3_image_keys) = 0)
    UNION ALL
    SELECT
      'care_history',
      COUNT(*)
    FROM care_history
    WHERE images IS NOT NULL
    AND (s3_image_keys IS NULL OR jsonb_array_length(s3_image_keys) = 0)
    UNION ALL
    SELECT
      'care_guides',
      COUNT(*)
    FROM care_guides
    WHERE images IS NOT NULL
    AND (s3_image_keys IS NULL OR jsonb_array_length(s3_image_keys) = 0)
  `);

  console.log('\n⚠️  Records with images column NOT NULL but no S3 keys:');
  console.table(unmigratedCheck.rows);

  await pool.end();
}

checkMigrationStatus().catch(console.error);