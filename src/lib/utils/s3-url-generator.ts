/**
 * S3 URL Generator - Server-side utility for generating presigned URLs
 * This runs only on the server and proxies through Lambda functions via API Gateway
 * No AWS credentials needed - Lambda functions use IAM roles
 */

const URL_EXPIRATION = 3600; // 1 hour

function getApiEndpoint(): string {
  const endpoint = process.env.AWS_API_ENDPOINT;
  if (!endpoint) {
    throw new Error('AWS_API_ENDPOINT environment variable is not set');
  }
  return endpoint;
}

export interface GeneratePresignedUrlParams {
  s3Key: string;
  expiresIn?: number;
}

export class S3UrlGenerator {
  /**
   * Generate a presigned URL for downloading an object from S3
   * Uses Lambda function via API Gateway - no AWS credentials needed
   * @param params - S3 key and optional expiration time
   * @returns Presigned URL that can be used to download the object
   */
  static async generatePresignedUrl(params: GeneratePresignedUrlParams): Promise<string> {
    const { s3Key, expiresIn = URL_EXPIRATION } = params;

    if (!s3Key) {
      throw new Error('S3 key is required');
    }

    try {
      const apiEndpoint = getApiEndpoint();

      // Extract userId from s3Key (format: users/{userId}/...)
      const userIdMatch = s3Key.match(/^users\/(\d+)\//);
      if (!userIdMatch) {
        throw new Error(`Invalid S3 key format: ${s3Key}`);
      }
      const userId = userIdMatch[1];

      // Call Lambda function via API Gateway
      const response = await fetch(`${apiEndpoint}/images/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          s3Key,
          expiresIn,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Lambda request failed: ${error.error || response.statusText}`);
      }

      const data = await response.json();

      if (!data.url) {
        throw new Error('Lambda response missing presigned URL');
      }

      return data.url;
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
   * Check if S3 is configured via Lambda API Gateway
   * @returns true if AWS API endpoint is set
   */
  static isConfigured(): boolean {
    return Boolean(process.env.AWS_API_ENDPOINT);
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
