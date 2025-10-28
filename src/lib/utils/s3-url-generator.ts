/**
 * S3 URL Generator - Server-side utility for generating presigned URLs
 * This runs only on the server and uses AWS SDK credentials
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const URL_EXPIRATION = 3600; // 1 hour

// Lazy initialization of S3 client to ensure env vars are loaded
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return s3Client;
}

function getBucketName(): string {
  const bucketName = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;
  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET_NAME or AWS_S3_BUCKET environment variable is not set');
  }
  return bucketName;
}

export interface GeneratePresignedUrlParams {
  s3Key: string;
  expiresIn?: number;
}

export class S3UrlGenerator {
  /**
   * Generate a presigned URL for downloading an object from S3
   * @param params - S3 key and optional expiration time
   * @returns Presigned URL that can be used to download the object
   */
  static async generatePresignedUrl(params: GeneratePresignedUrlParams): Promise<string> {
    const { s3Key, expiresIn = URL_EXPIRATION } = params;

    if (!s3Key) {
      throw new Error('S3 key is required');
    }

    try {
      const bucketName = getBucketName();
      const client = getS3Client();

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      const presignedUrl = await getSignedUrl(client, command, {
        expiresIn,
      });

      return presignedUrl;
    } catch (error) {
      console.error(`Failed to generate presigned URL for ${s3Key}:`, error);
      throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate presigned URLs for multiple S3 keys
   * @param s3Keys - Array of S3 keys
   * @param expiresIn - Optional expiration time in seconds
   * @returns Array of presigned URLs in the same order as input keys
   */
  static async generateMultiplePresignedUrls(
    s3Keys: string[],
    expiresIn?: number
  ): Promise<string[]> {
    if (!s3Keys || s3Keys.length === 0) {
      return [];
    }

    const urlPromises = s3Keys.map(s3Key =>
      this.generatePresignedUrl({ s3Key, expiresIn })
        .catch(error => {
          console.error(`Failed to generate URL for ${s3Key}:`, error);
          // Return empty string for failed URLs instead of breaking everything
          return '';
        })
    );

    return Promise.all(urlPromises);
  }

  /**
   * Check if S3 credentials are configured
   * @returns true if AWS credentials and bucket name are set
   */
  static isConfigured(): boolean {
    return Boolean(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      (process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET)
    );
  }

  /**
   * Transform S3 keys to presigned URLs
   * This is a helper method to convert s3ImageKeys to images field
   * @param s3Keys - Array of S3 keys from database
   * @returns Array of presigned URLs
   */
  static async transformS3KeysToUrls(s3Keys: string[] | null): Promise<string[]> {
    if (!s3Keys || s3Keys.length === 0) {
      return [];
    }

    // Filter out any empty or invalid keys
    const validKeys = s3Keys.filter(key => key && typeof key === 'string');

    if (validKeys.length === 0) {
      return [];
    }

    return this.generateMultiplePresignedUrls(validKeys);
  }
}
