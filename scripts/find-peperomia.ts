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

async function findPeperomia() {
  const result = await db.execute(sql`
    SELECT pi.id, pi.nickname, p.common_name,
           jsonb_array_length(pi.images) as base64_count,
           pi.s3_image_keys,
           jsonb_array_length(pi.s3_image_keys) as s3_count
    FROM plant_instances pi
    JOIN plants p ON pi.plant_id = p.id
    WHERE pi.user_id = 2
    AND (p.common_name ILIKE '%Peperomia%' OR pi.nickname ILIKE '%Peperomia%')
  `);

  console.log('Peperomia plants for user 2:');
  result.rows.forEach((row: any) => {
    console.log(`\nID: ${row.id}`);
    console.log(`  Name: ${row.nickname || row.common_name}`);
    console.log(`  Base64 images: ${row.base64_count}`);
    console.log(`  S3 keys: ${JSON.stringify(row.s3_image_keys)}`);
    console.log(`  S3 count: ${row.s3_count}`);
  });

  await pool.end();
}

findPeperomia().catch(console.error);