/**
 * Migration Script: Move existing Base64 images from database to S3
 *
 * This script:
 * 1. Reads all Base64 images from database
 * 2. Uploads them to S3 with user-specific paths
 * 3. Updates database with S3 keys
 * 4. Keeps Base64 images for rollback capability
 *
 * Usage:
 *   npx tsx scripts/migrations/migrate-images-to-s3.ts [--dry-run] [--table=<table_name>]
 *
 * Options:
 *   --dry-run       Simulate migration without making changes
 *   --table         Migrate specific table only (plant_instances, propagations, care_history, care_guides)
 */

// Load environment variables FIRST before any imports
import { config } from 'dotenv';
config({ path: '.env.local' });

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@/lib/db/script-connection';
import { plantInstances, propagations, careHistory, careGuides } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Configuration from environment variables
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.AWS_S3_BUCKET;
const DRY_RUN = process.argv.includes('--dry-run');
const SPECIFIC_TABLE = process.argv.find(arg => arg.startsWith('--table='))?.split('=')[1];

if (!S3_BUCKET) {
  console.error('❌ AWS_S3_BUCKET environment variable is required');
  process.exit(1);
}

const s3Client = new S3Client({ region: AWS_REGION });

interface MigrationStats {
  totalRecords: number;
  recordsWithImages: number;
  imagesMigrated: number;
  errors: number;
  skipped: number;
}

/**
 * Convert Base64 image to Buffer and extract metadata
 */
function parseBase64Image(base64String: string): {
  buffer: Buffer;
  contentType: string;
  extension: string;
} | null {
  try {
    // Handle data URL format: data:image/jpeg;base64,/9j/4AAQ...
    const matches = base64String.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);

    if (!matches) {
      console.warn('⚠️  Invalid Base64 format, skipping');
      return null;
    }

    const extension = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const contentType = `image/${extension}`;

    return { buffer, contentType, extension };
  } catch (error) {
    console.error('Error parsing Base64 image:', error);
    return null;
  }
}

/**
 * Upload image to S3
 */
async function uploadToS3(
  buffer: Buffer,
  s3Key: string,
  contentType: string
): Promise<boolean> {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would upload to S3: ${s3Key}`);
    return true;
  }

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
        StorageClass: 'INTELLIGENT_TIERING',
        ServerSideEncryption: 'AES256',
      })
    );

    console.log(`  ✅ Uploaded to S3: ${s3Key}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to upload ${s3Key}:`, error);
    return false;
  }
}

/**
 * Migrate images for plant instances
 */
async function migratePlantInstances(): Promise<MigrationStats> {
  console.log('\n🌱 Migrating plant instance images...\n');

  const stats: MigrationStats = {
    totalRecords: 0,
    recordsWithImages: 0,
    imagesMigrated: 0,
    errors: 0,
    skipped: 0,
  };

  const instances = await db.select().from(plantInstances);
  stats.totalRecords = instances.length;

  for (const instance of instances) {
    const images = instance.images as string[];
    if (!images || images.length === 0) {
      continue;
    }

    stats.recordsWithImages++;
    console.log(`\nProcessing plant instance #${instance.id} (${images.length} images)`);

    const s3Keys: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const base64Image = images[i];
      const parsed = parseBase64Image(base64Image);

      if (!parsed) {
        stats.skipped++;
        continue;
      }

      const { buffer, contentType, extension } = parsed;
      const s3Key = `users/${instance.userId}/plant_instance/${instance.id}/${createId()}.${extension}`;

      const uploaded = await uploadToS3(buffer, s3Key, contentType);

      if (uploaded) {
        s3Keys.push(s3Key);
        stats.imagesMigrated++;
      } else {
        stats.errors++;
      }
    }

    // Update database with S3 keys
    if (s3Keys.length > 0 && !DRY_RUN) {
      await db
        .update(plantInstances)
        .set({ s3ImageKeys: s3Keys })
        .where(eq(plantInstances.id, instance.id));

      console.log(`  ✅ Updated database with ${s3Keys.length} S3 keys`);
    }
  }

  return stats;
}

/**
 * Migrate images for propagations
 */
async function migratePropagations(): Promise<MigrationStats> {
  console.log('\n🌿 Migrating propagation images...\n');

  const stats: MigrationStats = {
    totalRecords: 0,
    recordsWithImages: 0,
    imagesMigrated: 0,
    errors: 0,
    skipped: 0,
  };

  const props = await db.select().from(propagations);
  stats.totalRecords = props.length;

  for (const prop of props) {
    const images = prop.images as string[];
    if (!images || images.length === 0) {
      continue;
    }

    stats.recordsWithImages++;
    console.log(`\nProcessing propagation #${prop.id} (${images.length} images)`);

    const s3Keys: string[] = [];

    for (const base64Image of images) {
      const parsed = parseBase64Image(base64Image);

      if (!parsed) {
        stats.skipped++;
        continue;
      }

      const { buffer, contentType, extension } = parsed;
      const s3Key = `users/${prop.userId}/propagation/${prop.id}/${createId()}.${extension}`;

      const uploaded = await uploadToS3(buffer, s3Key, contentType);

      if (uploaded) {
        s3Keys.push(s3Key);
        stats.imagesMigrated++;
      } else {
        stats.errors++;
      }
    }

    if (s3Keys.length > 0 && !DRY_RUN) {
      await db
        .update(propagations)
        .set({ s3ImageKeys: s3Keys })
        .where(eq(propagations.id, prop.id));

      console.log(`  ✅ Updated database with ${s3Keys.length} S3 keys`);
    }
  }

  return stats;
}

/**
 * Migrate images for care history
 */
async function migrateCareHistory(): Promise<MigrationStats> {
  console.log('\n📝 Migrating care history images...\n');

  const stats: MigrationStats = {
    totalRecords: 0,
    recordsWithImages: 0,
    imagesMigrated: 0,
    errors: 0,
    skipped: 0,
  };

  const history = await db.select().from(careHistory);
  stats.totalRecords = history.length;

  for (const record of history) {
    const images = record.images as string[];
    if (!images || images.length === 0) {
      continue;
    }

    stats.recordsWithImages++;
    console.log(`\nProcessing care history #${record.id} (${images.length} images)`);

    const s3Keys: string[] = [];

    for (const base64Image of images) {
      const parsed = parseBase64Image(base64Image);

      if (!parsed) {
        stats.skipped++;
        continue;
      }

      const { buffer, contentType, extension } = parsed;
      const s3Key = `users/${record.userId}/care_history/${record.id}/${createId()}.${extension}`;

      const uploaded = await uploadToS3(buffer, s3Key, contentType);

      if (uploaded) {
        s3Keys.push(s3Key);
        stats.imagesMigrated++;
      } else {
        stats.errors++;
      }
    }

    if (s3Keys.length > 0 && !DRY_RUN) {
      await db
        .update(careHistory)
        .set({ s3ImageKeys: s3Keys })
        .where(eq(careHistory.id, record.id));

      console.log(`  ✅ Updated database with ${s3Keys.length} S3 keys`);
    }
  }

  return stats;
}

/**
 * Migrate images for care guides
 */
async function migrateCareGuides(): Promise<MigrationStats> {
  console.log('\n📚 Migrating care guide images...\n');

  const stats: MigrationStats = {
    totalRecords: 0,
    recordsWithImages: 0,
    imagesMigrated: 0,
    errors: 0,
    skipped: 0,
  };

  const guides = await db.select().from(careGuides);
  stats.totalRecords = guides.length;

  for (const guide of guides) {
    const images = guide.images as string[];
    if (!images || images.length === 0) {
      continue;
    }

    stats.recordsWithImages++;
    console.log(`\nProcessing care guide #${guide.id} (${images.length} images)`);

    const s3Keys: string[] = [];

    for (const base64Image of images) {
      const parsed = parseBase64Image(base64Image);

      if (!parsed) {
        stats.skipped++;
        continue;
      }

      const { buffer, contentType, extension } = parsed;
      const s3Key = `users/${guide.userId}/care_guide/${guide.id}/${createId()}.${extension}`;

      const uploaded = await uploadToS3(buffer, s3Key, contentType);

      if (uploaded) {
        s3Keys.push(s3Key);
        stats.imagesMigrated++;
      } else {
        stats.errors++;
      }
    }

    if (s3Keys.length > 0 && !DRY_RUN) {
      await db
        .update(careGuides)
        .set({ s3ImageKeys: s3Keys })
        .where(eq(careGuides.id, guide.id));

      console.log(`  ✅ Updated database with ${s3Keys.length} S3 keys`);
    }
  }

  return stats;
}

/**
 * Print migration summary
 */
function printSummary(tableName: string, stats: MigrationStats) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${tableName} Migration Summary`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total records:           ${stats.totalRecords}`);
  console.log(`Records with images:     ${stats.recordsWithImages}`);
  console.log(`Images migrated:         ${stats.imagesMigrated}`);
  console.log(`Images skipped:          ${stats.skipped}`);
  console.log(`Errors:                  ${stats.errors}`);
  console.log(`${'='.repeat(60)}\n`);
}

/**
 * Main migration function
 */
async function main() {
  console.log('\n🚀 Starting image migration to S3...');
  console.log(`S3 Bucket: ${S3_BUCKET}`);
  console.log(`Region: ${AWS_REGION}`);

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }

  const allStats: Record<string, MigrationStats> = {};

  try {
    if (!SPECIFIC_TABLE || SPECIFIC_TABLE === 'plant_instances') {
      allStats.plant_instances = await migratePlantInstances();
      printSummary('Plant Instances', allStats.plant_instances);
    }

    if (!SPECIFIC_TABLE || SPECIFIC_TABLE === 'propagations') {
      allStats.propagations = await migratePropagations();
      printSummary('Propagations', allStats.propagations);
    }

    if (!SPECIFIC_TABLE || SPECIFIC_TABLE === 'care_history') {
      allStats.care_history = await migrateCareHistory();
      printSummary('Care History', allStats.care_history);
    }

    if (!SPECIFIC_TABLE || SPECIFIC_TABLE === 'care_guides') {
      allStats.care_guides = await migrateCareGuides();
      printSummary('Care Guides', allStats.care_guides);
    }

    // Overall summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Overall Migration Summary');
    console.log('='.repeat(60));

    const totals = Object.values(allStats).reduce(
      (acc, stats) => ({
        totalRecords: acc.totalRecords + stats.totalRecords,
        recordsWithImages: acc.recordsWithImages + stats.recordsWithImages,
        imagesMigrated: acc.imagesMigrated + stats.imagesMigrated,
        errors: acc.errors + stats.errors,
        skipped: acc.skipped + stats.skipped,
      }),
      {
        totalRecords: 0,
        recordsWithImages: 0,
        imagesMigrated: 0,
        errors: 0,
        skipped: 0,
      }
    );

    console.log(`Total records processed: ${totals.totalRecords}`);
    console.log(`Total images migrated:   ${totals.imagesMigrated}`);
    console.log(`Total images skipped:    ${totals.skipped}`);
    console.log(`Total errors:            ${totals.errors}`);
    console.log('='.repeat(60));

    if (DRY_RUN) {
      console.log('\n✅ Dry run completed. Re-run without --dry-run to perform migration.');
    } else {
      console.log('\n✅ Migration completed successfully!');
      console.log('\n⚠️  IMPORTANT: Base64 images are still in the database for rollback.');
      console.log('   After verifying the migration, you can remove them by running:');
      console.log('   npx tsx scripts/migrations/cleanup-base64-images.ts');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
