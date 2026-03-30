import type { MetadataRoute } from 'next';

/**
 * Fancy Planties is a private app — disallow all search engine crawling.
 * Auth protects routes anyway, but this prevents bots from wasting
 * bandwidth probing login pages and static assets.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
