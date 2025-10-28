#!/usr/bin/env tsx

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') });

import { S3UrlGenerator } from '../src/lib/utils/s3-url-generator.js';

async function testS3UrlGeneration() {
  console.log('Testing S3 URL generation...\n');

  // Check if configured
  console.log('S3 configured:', S3UrlGenerator.isConfigured());

  if (!S3UrlGenerator.isConfigured()) {
    console.error('❌ S3 is not configured. Check environment variables.');
    return;
  }

  // Test with a known S3 key from the Peperomia Ginny plant (ID 106)
  const testKeys = [
    'users/2/plant_instance/106/m1am6p179ed1ptfnuijkj7ng.jpeg',
    'users/2/plant_instance/106/ne3cs1gikxhm08kcxdk0emyx.jpeg'
  ];

  console.log('Test S3 keys:', testKeys);

  try {
    console.log('\nGenerating presigned URLs...');
    const urls = await S3UrlGenerator.generateMultiplePresignedUrls(testKeys);

    console.log('\n✅ Successfully generated presigned URLs:');
    urls.forEach((url, index) => {
      if (url) {
        console.log(`\n${index + 1}. ${testKeys[index]}`);
        console.log(`   URL: ${url.substring(0, 100)}...`);
      } else {
        console.log(`\n${index + 1}. ${testKeys[index]}`);
        console.log(`   ❌ Failed to generate URL`);
      }
    });
  } catch (error) {
    console.error('\n❌ Error generating presigned URLs:', error);
  }
}

testS3UrlGeneration().catch(console.error);