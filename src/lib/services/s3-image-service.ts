/**
 * S3 Image Service
 * Handles secure image uploads and downloads via S3 with pre-signed URLs
 */

const API_ENDPOINT = process.env.NEXT_PUBLIC_AWS_API_ENDPOINT || '';

export interface PresignedUploadResponse {
  url: string;
  fields: Record<string, string>;
  s3Key: string;
  expiresIn: number;
  message: string;
}

export interface PresignedDownloadResponse {
  url: string;
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

export interface DownloadImageParams {
  userId: string;
  s3Key: string;
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
   * Get a pre-signed URL for downloading an image from S3
   */
  static async getPresignedDownloadUrl(params: DownloadImageParams): Promise<PresignedDownloadResponse> {
    const { userId, s3Key } = params;

    const response = await fetch(`${API_ENDPOINT}/images/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        s3Key,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get download URL');
    }

    return response.json();
  }

  /**
   * Get download URLs for multiple S3 keys
   */
  static async getMultipleDownloadUrls(
    userId: string,
    s3Keys: string[]
  ): Promise<Map<string, string>> {
    const downloadPromises = s3Keys.map(s3Key =>
      this.getPresignedDownloadUrl({ userId, s3Key })
        .then(response => ({ s3Key, url: response.url }))
        .catch(error => {
          console.error(`Failed to get download URL for ${s3Key}:`, error);
          return { s3Key, url: '' };
        })
    );

    const results = await Promise.all(downloadPromises);

    const urlMap = new Map<string, string>();
    results.forEach(({ s3Key, url }) => {
      if (url) {
        urlMap.set(s3Key, url);
      }
    });

    return urlMap;
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
