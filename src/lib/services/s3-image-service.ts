/**
 * S3 Image Service
 * Handles secure image uploads via S3 with pre-signed URLs
 * Uses CloudFront signed cookies for authenticated image access
 */

const API_ENDPOINT = process.env.NEXT_PUBLIC_AWS_API_ENDPOINT || '';

export interface PresignedUploadResponse {
  url: string;
  fields: Record<string, string>;
  s3Key: string;
  expiresIn: number;
  message: string;
}

export interface UploadImageParams {
  userId: string;
  entityType: 'plant_instance' | 'propagation' | 'care_history' | 'care_guide';
  entityId: string;
  file: File;
}


export class S3ImageService {
  /**
   * Get a pre-signed URL for uploading an image to S3
   */
  static async getPresignedUploadUrl(params: UploadImageParams): Promise<PresignedUploadResponse> {
    const { userId, entityType, entityId, file } = params;

    // Determine content type and file extension
    const contentType = file.type;
    const fileExtension = file.name.split('.').pop() || 'jpg';

    const response = await fetch(`${API_ENDPOINT}/images/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        entityType,
        entityId,
        contentType,
        fileExtension,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get upload URL');
    }

    return response.json();
  }

  /**
   * Upload an image file to S3 using pre-signed URL
   */
  static async uploadImage(params: UploadImageParams): Promise<string> {
    const { file } = params;

    // Get pre-signed upload URL
    const uploadData = await this.getPresignedUploadUrl(params);

    // Create form data for S3 upload
    const formData = new FormData();

    // Add all fields from pre-signed POST
    Object.entries(uploadData.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // Add the file last (required by AWS)
    formData.append('file', file);

    // Upload to S3
    const uploadResponse = await fetch(uploadData.url, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('S3 upload failed:', errorText);
      throw new Error('Failed to upload image to S3');
    }

    // Return the S3 key for database storage
    return uploadData.s3Key;
  }

  /**
   * Upload multiple images to S3
   */
  static async uploadMultipleImages(
    params: Omit<UploadImageParams, 'file'> & { files: File[] }
  ): Promise<string[]> {
    const { files, ...uploadParams } = params;

    const uploadPromises = files.map(file =>
      this.uploadImage({ ...uploadParams, file })
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Initialize CloudFront signed cookies for the current user session
   * Call this once after user login to enable direct CloudFront access
   * Cookies are valid for 7 days
   */
  static async initializeSignedCookies(): Promise<void> {
    const response = await fetch('/api/images/auth-cookie', {
      method: 'POST',
      credentials: 'include', // Important: include cookies in request
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to initialize CloudFront cookies');
    }

    const data = await response.json();
    console.log('[S3ImageService] CloudFront cookies initialized:', data);
  }

  /**
   * Convert S3 key to image URL
   *
   * Uses direct CloudFront URL with custom domain (cdn.fancy-planties.cloudagrapher.com)
   * Parent domain cookies (.fancy-planties.cloudagrapher.com) enable access in both dev and prod
   *
   * @param s3Key - The S3 object key (e.g., "users/123/plant_instance/456/image.jpg")
   * @returns CloudFront URL
   */
  static s3KeyToCloudFrontUrl(s3Key: string): string {
    const cloudfrontDomain = this.getCloudFrontDomain();

    if (!cloudfrontDomain) {
      throw new Error('CloudFront domain not configured');
    }
    return `https://${cloudfrontDomain}/${s3Key}`;
  }

  /**
   * Convert multiple S3 keys to CloudFront URLs
   *
   * @param s3Keys - Array of S3 object keys
   * @returns Array of CloudFront URLs in the same order
   */
  static s3KeysToCloudFrontUrls(s3Keys: string[]): string[] {
    return s3Keys.map(key => this.s3KeyToCloudFrontUrl(key));
  }

  /**
   * Delete an image from S3 (called via application API, not direct S3 access)
   * This should be implemented in a separate API route that validates ownership
   */
  static async deleteImage(userId: string, s3Key: string): Promise<void> {
    // TODO: Implement delete endpoint in API
    throw new Error('Delete functionality not yet implemented');
  }

  /**
   * Check if S3 integration is enabled
   */
  static isEnabled(): boolean {
    return Boolean(API_ENDPOINT);
  }

  /**
   * Get CloudFront domain for direct image access (if available)
   */
  static getCloudFrontDomain(): string {
    return process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || '';
  }
}
