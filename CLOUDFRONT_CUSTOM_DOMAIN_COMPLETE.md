# CloudFront Custom Domain Setup - Complete

## Summary

Successfully configured CloudFront with custom domain `cdn.fancy-planties.cloudagrapher.com` for direct image access with signed cookies.

## Configuration Changes

### 1. CloudFront Distribution
- ✅ Custom domain: `cdn.fancy-planties.cloudagrapher.com`
- ✅ SSL certificate: `arn:aws:acm:us-east-1:580033881001:certificate/cbaa9ed3-c244-4a39-95cc-20aa3bd515d8`
- ✅ Wildcard cert `*.cloudagrapher.com` covers the CDN subdomain
- ✅ DNS CNAME record created (managed by Cloudflare)

### 2. Application Updates

#### Cookie Domain Configuration ([auth-cookie/route.ts](src/app/api/images/auth-cookie/route.ts:72-74))
```typescript
domain: process.env.NODE_ENV === 'production' && cloudfrontDomain.includes('fancy-planties.cloudagrapher.com')
  ? '.fancy-planties.cloudagrapher.com'  // Parent domain for custom CDN
  : cloudfrontDomain                     // Default CloudFront domain for dev
```

**Why this works:**
- Cookies set with `domain=.fancy-planties.cloudagrapher.com` work for both:
  - `fancy-planties.cloudagrapher.com` (app)
  - `cdn.fancy-planties.cloudagrapher.com` (CDN)
- Browser automatically sends cookies to both domains

#### S3ImageService ([s3-image-service.ts](src/lib/services/s3-image-service.ts:138-152))
```typescript
// Development: Use proxy
if (isDevelopment) {
  return `/api/images/proxy?key=${encodeURIComponent(s3Key)}`;
}

// Production: Direct CloudFront access
return `https://${cloudfrontDomain}/${s3Key}`;
```

#### S3Image Component ([S3Image.tsx](src/components/shared/S3Image.tsx:50-65))
- Development: Uses `<img>` tag (avoids Next.js Image Optimization which can't access session)
- Production: Uses `<Image>` tag with Next.js optimization

### 3. Environment Variables

Update your production `.env.prod` with:
```bash
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=cdn.fancy-planties.cloudagrapher.com
CLOUDFRONT_PUBLIC_KEY_ID=K2OWI8TFAG01ZW
```

## How It Works

### Development (localhost:3000)
1. User logs in → CloudFront cookies initialized
2. Images use proxy: `/api/images/proxy?key=users/2/...`
3. Proxy fetches from CloudFront with signed cookies
4. Returns image to browser

### Production (fancy-planties.cloudagrapher.com)
1. User logs in → CloudFront cookies initialized with `domain=.fancy-planties.cloudagrapher.com`
2. Images use direct CloudFront: `https://cdn.fancy-planties.cloudagrapher.com/users/2/...`
3. Browser automatically sends cookies to CDN
4. CloudFront validates cookies and serves images directly
5. **No proxy needed!**

## Benefits

### Performance
- ✅ Direct edge location access (lower latency)
- ✅ Full CloudFront caching benefits
- ✅ No proxy overhead
- ✅ Faster image loading globally

### Cost
- ✅ Reduced server bandwidth (CloudFront handles all image traffic)
- ✅ CloudFront data transfer cheaper than proxy bandwidth
- ✅ Better scalability for many users

### Professional
- ✅ Custom branded CDN URL
- ✅ First-party cookies (better privacy/security)
- ✅ Proper CDN architecture

## Testing Checklist

### Pre-Deployment
- [x] SSL certificate validated and issued
- [x] DNS CNAME record created
- [x] CDK stack updated with custom domain
- [x] Cookie domain configuration updated
- [x] S3ImageService updated for production
- [x] Environment variables documented

### Post-Deployment
- [ ] DNS resolves: `dig cdn.fancy-planties.cloudagrapher.com`
- [ ] SSL works: `curl -I https://cdn.fancy-planties.cloudagrapher.com`
- [ ] Deploy CDK stack: `cdk deploy FancyPlantiesStorage-prod`
- [ ] Update production `.env.prod`
- [ ] Rebuild and deploy Docker container
- [ ] Test image loading in production
- [ ] Verify cookies set with correct domain
- [ ] Check browser DevTools for cookie domain

## Deployment Steps

### 1. Deploy CDK Stack
```bash
cd cdk
source .venv/bin/activate
cdk deploy FancyPlantiesStorage-prod --profile stefaws -c environment=prod
```

### 2. Update Production Environment
SSH to production server and update `.env.prod`:
```bash
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=cdn.fancy-planties.cloudagrapher.com
```

### 3. Rebuild Application
```bash
git pull origin main
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

### 4. Verify
1. Open https://fancy-planties.cloudagrapher.com
2. Login
3. Open DevTools > Application > Cookies
4. Verify cookies have `domain=.fancy-planties.cloudagrapher.com`
5. Navigate to dashboard
6. Check Network tab - images should load from `cdn.fancy-planties.cloudagrapher.com`
7. Images should load successfully (200 OK)

## Troubleshooting

### DNS Not Resolving
**Check:**
```bash
dig cdn.fancy-planties.cloudagrapher.com
```
**Should return:** CNAME pointing to CloudFront distribution

**Fix:** Wait for DNS propagation (5-30 minutes) or check Cloudflare DNS settings

### SSL Certificate Error
**Check:**
```bash
curl -I https://cdn.fancy-planties.cloudagrapher.com
```
**Should return:** 200 OK with valid SSL

**Fix:** Verify certificate in CloudFront distribution configuration

### Images Still Getting 403
**Possible causes:**
1. Cookies not being set with correct domain
2. CloudFront distribution not updated with custom domain
3. DNS not resolving correctly

**Debug:**
1. Check cookie domain in DevTools (should be `.fancy-planties.cloudagrapher.com`)
2. Verify `NEXT_PUBLIC_CLOUDFRONT_DOMAIN=cdn.fancy-planties.cloudagrapher.com`
3. Check CloudFront distribution has custom domain configured
4. Clear cookies and login again

## Rollback Procedure

If issues occur, rollback to proxy mode:

### Quick Rollback (Application Only)
```bash
# Revert environment variable
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=d2ptipi9zhrqf0.cloudfront.net

# Or use proxy in production
# Update s3-image-service.ts to always use proxy
```

### Full Rollback (Infrastructure)
```bash
# Revert CDK changes
git revert <commit-hash>
cd cdk
cdk deploy FancyPlantiesStorage-prod --profile stefaws
```

## Performance Metrics

### Before (Proxy)
- Image request flow: Browser → Next.js → CloudFront → Next.js → Browser
- Latency: Server location + CloudFront
- Bandwidth: Server bears all image traffic

### After (Custom Domain)
- Image request flow: Browser → CloudFront → Browser
- Latency: Nearest edge location
- Bandwidth: CloudFront edge handles all traffic

**Expected improvement:**
- 30-50% faster image loading
- 90% reduction in server bandwidth
- Better scalability

## Files Modified

1. ✅ `cdk/stacks/storage_stack.py` - Added ACM certificate and custom domain
2. ✅ `src/app/api/images/auth-cookie/route.ts` - Updated cookie domain logic
3. ✅ `src/lib/services/s3-image-service.ts` - Updated to use direct CloudFront in production
4. ✅ `.env.example` - Updated with custom domain documentation

## Documentation

- Custom domain setup guide: [cdk/CLOUDFRONT_CUSTOM_DOMAIN_SETUP.md](cdk/CLOUDFRONT_CUSTOM_DOMAIN_SETUP.md)
- Migration guide: [CLOUDFRONT_MIGRATION_GUIDE.md](CLOUDFRONT_MIGRATION_GUIDE.md)
- Migration summary: [CLOUDFRONT_MIGRATION_SUMMARY.md](CLOUDFRONT_MIGRATION_SUMMARY.md)

## Next Steps

1. Deploy CDK stack to production
2. Update production environment variables
3. Rebuild and deploy Docker container
4. Test and verify image loading
5. Monitor CloudFront logs for any issues
6. Consider enabling CloudFront access logging for analytics

## Status

🚀 **Ready for Production Deployment**

All code changes complete. Ready to deploy CDK stack and update production environment.
