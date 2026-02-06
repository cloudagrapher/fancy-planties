/**
 * Utility to determine if an image should bypass Next.js optimization
 * CloudFront images need direct browser access to send signed cookies
 */

/**
 * Check if the image URL is from our CloudFront CDN
 * Supports both new domain (fancy-planties.com) and legacy domain (cloudagrapher.com)
 */
export function shouldUnoptimizeImage(src: string): boolean {
  return (
    src.startsWith('https://cdn.fancy-planties.com') ||
    src.startsWith('https://cdn.fancy-planties.cloudagrapher.com')
  );
}

/**
 * Get image props for Next.js Image component
 * Automatically adds unoptimized flag for CloudFront URLs
 */
export function getImageProps(src: string) {
  return {
    src,
    unoptimized: shouldUnoptimizeImage(src),
  };
}
