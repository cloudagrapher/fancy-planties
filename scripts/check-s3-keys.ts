#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '../.env.local') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function checkS3Keys() {
  console.log('Database URL:', process.env.DATABASE_URL?.replace(/:[^:]+@/, ':****@'));

  // Check a few specific records that should have been migrated
  const result = await db.execute(sql`
    SELECT id,
           CASE WHEN images IS NOT NULL THEN jsonb_array_length(images) ELSE 0 END as image_count,
           s3_image_keys,
           CASE WHEN s3_image_keys IS NOT NULL THEN jsonb_array_length(s3_image_keys) ELSE 0 END as s3_count
    FROM plant_instances
    WHERE id IN (75, 96, 93, 74, 73)
    ORDER BY id
  `);

  console.log('\nSample plant_instances records (these were shown as migrated):');
  result.rows.forEach((row: any) => {
    console.log(`ID ${row.id}: ${row.image_count} base64 images, S3 keys: ${JSON.stringify(row.s3_image_keys)}`);
  });

  // Check overall stats
  const stats = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN images IS NOT NULL AND jsonb_array_length(images) > 0 THEN 1 END) as with_images,
      COUNT(CASE WHEN s3_image_keys IS NOT NULL AND jsonb_array_length(s3_image_keys) > 0 THEN 1 END) as with_s3_keys
    FROM plant_instances
  `);

  console.log('\nOverall plant_instances stats:');
  console.log(stats.rows[0]);

  await pool.end();
}

checkS3Keys().catch(console.error);