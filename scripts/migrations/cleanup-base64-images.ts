#!/usr/bin/env tsx

/**
 * Cleanup script to remove Base64 image data after successful migration to S3
 *
 * IMPORTANT: Only run this after verifying that all images have been successfully
 * migrated to S3 and are accessible.
 *
 * This script will:
 * 1. Check that S3 keys exist for all records with images
 * 2. Remove Base64 data from the database
 * 3. Provide a summary of cleaned records
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import chalk from 'chalk';
import {
  plantInstances,
  propagations,
  careHistory,
  careGuides
} from '../../src/lib/db/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../../.env.local') });

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  console.error(chalk.red('❌ DATABASE_URL environment variable is not set'));
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  max: 10,
});

const db = drizzle(pool, {
  logger: false,
});

interface CleanupStats {
  totalRecords: number;
  recordsWithImages: number;
  recordsWithS3Keys: number;
  recordsCleaned: number;
  errors: number;
}

async function cleanupTable(
  tableName: string,
  table: any,
  displayName: string
): Promise<CleanupStats> {
  const stats: CleanupStats = {
    totalRecords: 0,
    recordsWithImages: 0,
    recordsWithS3Keys: 0,
    recordsCleaned: 0,
    errors: 0,
  };

  console.log(chalk.cyan(`\n🧹 Cleaning ${displayName}...`));

  try {
    // Get all records with actual image data (non-empty arrays)
    const records = await db
      .select()
      .from(table)
      .where(sql`${table.images} IS NOT NULL AND jsonb_array_length(${table.images}) > 0`);

    stats.totalRecords = records.length;
    stats.recordsWithImages = records.length;

    if (records.length === 0) {
      console.log(chalk.gray('  No records with actual images to clean'));
      return stats;
    }

    // Check which records have S3 keys
    for (const record of records) {
      if (record.s3ImageKeys && Array.isArray(record.s3ImageKeys) && record.s3ImageKeys.length > 0) {
        stats.recordsWithS3Keys++;
      } else {
        console.log(chalk.yellow(`  ⚠️  Record #${record.id} has images but no S3 keys - skipping`));
      }
    }

    // Safety check
    if (stats.recordsWithS3Keys === 0) {
      console.log(chalk.yellow('  ⚠️  No records have S3 keys - skipping cleanup'));
      return stats;
    }

    // Perform cleanup - only for records that have both actual images and S3 keys
    console.log(chalk.cyan(`  Cleaning ${stats.recordsWithS3Keys} records...`));

    const result = await db.execute(sql`
      UPDATE ${table}
      SET images = '[]'::jsonb
      WHERE images IS NOT NULL
      AND jsonb_array_length(images) > 0
      AND s3_image_keys IS NOT NULL
      AND jsonb_array_length(s3_image_keys) > 0
    `);

    stats.recordsCleaned = result.rowCount || 0;
    console.log(chalk.green(`  ✅ Cleaned ${stats.recordsCleaned} records`));

  } catch (error) {
    console.error(chalk.red(`  ❌ Error cleaning ${displayName}:`), error);
    stats.errors++;
  }

  return stats;
}

async function verifyS3Migration(): Promise<boolean> {
  console.log(chalk.cyan('\n🔍 Verifying S3 migration before cleanup...'));

  try {
    // Check if there are any records with actual image data but no S3 keys
    const tables = [
      { table: plantInstances, name: 'plant_instances' },
      { table: propagations, name: 'propagations' },
      { table: careHistory, name: 'care_history' },
      { table: careGuides, name: 'care_guides' },
    ];

    let hasUnmigratedRecords = false;

    for (const { table, name } of tables) {
      // Only check records that have actual image data (non-empty arrays)
      const unmigrated = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM ${table}
        WHERE images IS NOT NULL
        AND jsonb_array_length(images) > 0
        AND (s3_image_keys IS NULL OR jsonb_array_length(s3_image_keys) = 0)
      `);

      const count = parseInt(unmigrated.rows[0].count as string);
      if (count > 0) {
        console.log(chalk.red(`  ❌ ${name} has ${count} records with actual images but no S3 keys`));
        hasUnmigratedRecords = true;
      }
    }

    if (hasUnmigratedRecords) {
      console.log(chalk.red('\n❌ Some records have not been migrated to S3 yet!'));
      console.log(chalk.yellow('Please run the migration script first:'));
      console.log(chalk.cyan('  npx tsx scripts/migrations/0005_migrate_images_to_s3.ts'));
      return false;
    }

    console.log(chalk.green('  ✅ All records with actual images have S3 keys'));
    return true;

  } catch (error) {
    console.error(chalk.red('  ❌ Error verifying migration:'), error);
    return false;
  }
}

async function main() {
  console.log(chalk.bold.cyan('\n🧹 Base64 Image Cleanup Script'));
  console.log(chalk.gray('=' .repeat(60)));

  // Verify migration first
  const migrationVerified = await verifyS3Migration();
  if (!migrationVerified) {
    await pool.end();
    process.exit(1);
  }

  // Ask for confirmation
  console.log(chalk.yellow('\n⚠️  WARNING: This will permanently remove Base64 image data from the database!'));
  console.log(chalk.yellow('Make sure you have verified that all images are accessible from S3.'));
  console.log(chalk.cyan('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...'));

  await new Promise(resolve => setTimeout(resolve, 5000));

  const overallStats: CleanupStats = {
    totalRecords: 0,
    recordsWithImages: 0,
    recordsWithS3Keys: 0,
    recordsCleaned: 0,
    errors: 0,
  };

  // Clean each table
  const tables = [
    { table: plantInstances, name: 'plant_instances', display: 'Plant Instances' },
    { table: propagations, name: 'propagations', display: 'Propagations' },
    { table: careHistory, name: 'care_history', display: 'Care History' },
    { table: careGuides, name: 'care_guides', display: 'Care Guides' },
  ];

  for (const { table, name, display } of tables) {
    const stats = await cleanupTable(name, table, display);
    overallStats.totalRecords += stats.totalRecords;
    overallStats.recordsWithImages += stats.recordsWithImages;
    overallStats.recordsWithS3Keys += stats.recordsWithS3Keys;
    overallStats.recordsCleaned += stats.recordsCleaned;
    overallStats.errors += stats.errors;
  }

  // Display summary
  console.log(chalk.gray('\n' + '='.repeat(60)));
  console.log(chalk.bold.cyan('📊 Cleanup Summary'));
  console.log(chalk.gray('='.repeat(60)));
  console.log(chalk.white(`Records with images:     ${overallStats.recordsWithImages}`));
  console.log(chalk.white(`Records with S3 keys:    ${overallStats.recordsWithS3Keys}`));
  console.log(chalk.green(`Records cleaned:         ${overallStats.recordsCleaned}`));
  if (overallStats.errors > 0) {
    console.log(chalk.red(`Errors:                  ${overallStats.errors}`));
  }
  console.log(chalk.gray('='.repeat(60)));

  if (overallStats.errors === 0 && overallStats.recordsCleaned === overallStats.recordsWithS3Keys) {
    console.log(chalk.green('\n✅ Cleanup completed successfully!'));
    console.log(chalk.gray('Base64 image data has been removed from the database.'));
    console.log(chalk.gray('All images are now served from S3.'));
  } else {
    console.log(chalk.yellow('\n⚠️  Cleanup completed with warnings'));
    console.log(chalk.yellow('Some records may not have been cleaned. Please review the output above.'));
  }

  await pool.end();
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});