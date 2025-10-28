#!/usr/bin/env tsx

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '../.env.local') });

async function testAPIResponse() {
  console.log('Testing API response for plant instances...\n');

  try {
    // Test the plant instances endpoint
    const response = await fetch('http://localhost:3000/api/plant-instances?limit=5', {
      headers: {
        'Cookie': 'auth_session=your_session_cookie_here', // This won't work without auth, but let's see the structure
      },
    });

    console.log('Response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('\nAPI Response structure:');
      console.log('- Total instances:', data.instances?.length || 0);

      if (data.instances && data.instances.length > 0) {
        const firstInstance = data.instances[0];
        console.log('\nFirst instance:');
        console.log('- ID:', firstInstance.id);
        console.log('- Has images:', firstInstance.images?.length || 0);
        console.log('- Has s3ImageKeys:', firstInstance.s3ImageKeys?.length || 0);

        if (firstInstance.s3ImageKeys && firstInstance.s3ImageKeys.length > 0) {
          console.log('\nS3 Image Keys:', firstInstance.s3ImageKeys);
        }

        if (firstInstance.images && firstInstance.images.length > 0) {
          console.log('\nImages:', firstInstance.images.map((img: string) => img.substring(0, 100) + '...'));
        }
      }
    } else {
      console.log('Error response:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPIResponse().catch(console.error);