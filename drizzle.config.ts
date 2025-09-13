import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';

// Determine environment and load appropriate .env file
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
      console.log(`Loading Drizzle config from: ${envFile}`);
      dotenv.config({ path: envFile });
      break;
    }
  }

  // Verify DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    throw new Error(`DATABASE_URL not found in environment files: ${envFiles.join(', ')}`);
  }

  return process.env.DATABASE_URL;
}

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: loadEnvironmentConfig(),
  },
});