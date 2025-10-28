#!/usr/bin/env tsx

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '../.env.local') });

import { PlantInstanceQueries } from '../src/lib/db/queries/plant-instances.js';
import { S3UrlGenerator } from '../src/lib/utils/s3-url-generator.js';

async function testDirectQuery() {
  console.log('Testing direct database query and transformation...\n');

  try {
    // Get plant instances for user 2
    const result = await PlantInstanceQueries.getWithFilters({
      userId: 2,
      isActive: true,
      limit: 5,
      offset: 0,
    });

    console.log(`Found ${result.instances.length} instances\n`);

    if (result.instances.length > 0) {
      // Find one with images
      const withImages = result.instances.find(i => i.s3ImageKeys && i.s3ImageKeys.length > 0);

      if (withImages) {
        console.log(`Instance #${withImages.id}:`);
        console.log(`- Nickname: ${withImages.nickname || withImages.plant.commonName}`);
        console.log(`- S3 keys: ${withImages.s3ImageKeys?.length || 0}`);
        console.log(`- Images before transform: ${withImages.images?.length || 0}`);

        if (withImages.s3ImageKeys && withImages.s3ImageKeys.length > 0) {
          console.log(`\nS3 Keys:`);
          withImages.s3ImageKeys.forEach((key: string) => console.log(`  - ${key}`));

          console.log('\nTransforming to presigned URLs...');
          const presignedUrls = await S3UrlGenerator.transformS3KeysToUrls(withImages.s3ImageKeys);
          console.log(`Generated ${presignedUrls.length} presigned URLs`);

          if (presignedUrls.length > 0) {
            console.log('\nFirst presigned URL:');
            console.log(presignedUrls[0].substring(0, 120) + '...');
          }
        }
      } else {
        console.log('No instances with S3 images found');
        console.log('\nFirst instance details:');
        const first = result.instances[0];
        console.log(`- ID: ${first.id}`);
        console.log(`- s3ImageKeys:`, first.s3ImageKeys);
        console.log(`- images:`, first.images);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testDirectQuery().catch(console.error);