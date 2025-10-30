# CloudFront Custom Domain Setup Guide

## Overview

This guide explains how to configure a custom CloudFront domain (`cdn.fancy-planties.cloudagrapher.com`) to eliminate the need for an image proxy and enable direct CloudFront access with signed cookies.

## Current Setup (Using Proxy)

**Current Behavior**:
- App Domain: `fancy-planties.cloudagrapher.com`
- CloudFront Domain: `d2ptipi9zhrqf0.cloudfront.net`
- Image URLs: `/api/images/proxy?key=users/2/...` (proxied through Next.js)

**Why Proxy is Needed**:
- Browsers prevent setting cookies for different domains (security restriction)
- App at `fancy-planties.cloudagrapher.com` cannot set cookies for `d2ptipi9zhrqf0.cloudfront.net`
- Proxy fetches images server-side with signed cookies and returns them to client

**Limitations**:
- Extra latency (request goes through your Next.js server)
- Uses your server bandwidth instead of CloudFront edge
- No CDN caching benefit for end users

## Future Setup (Custom CloudFront Domain)

**Target Behavior**:
- App Domain: `fancy-planties.cloudagrapher.com`
- CloudFront Domain: `cdn.fancy-planties.cloudagrapher.com`
- Image URLs: `https://cdn.fancy-planties.cloudagrapher.com/users/2/...` (direct CloudFront)

**Why This Works**:
- Both domains share parent domain: `.fancy-planties.cloudagrapher.com`
- Cookies can be set with `domain: .fancy-planties.cloudagrapher.com`
- Browser automatically sends these cookies to both domains
- No proxy needed!

**Benefits**:
- ✅ Direct CloudFront access (faster, lower latency)
- ✅ Full CDN caching and edge location benefits
- ✅ Reduced bandwidth on your Next.js server
- ✅ Better scalability for many users
- ✅ Professional URL structure

## Implementation Steps

### Prerequisites

- AWS account with CloudFront and Route 53 access
- Domain hosted in Route 53: `fancy-planties.cloudagrapher.com`
- SSL certificate in `us-east-1` (CloudFront requires this region)

### Step 1: Request SSL Certificate

CloudFront requires SSL certificates to be in the `us-east-1` region.

```bash
# Request certificate in us-east-1 (required for CloudFront)
aws acm request-certificate \
  --domain-name "cdn.fancy-planties.cloudagrapher.com" \
  --validation-method DNS \
  --region us-east-1 \
  --profile stefaws

# Note the CertificateArn from the output
```

### Step 2: Validate Certificate

```bash
# Get validation records
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:580033881001:certificate/CERT_ID \
  --region us-east-1 \
  --profile stefaws

# Add the CNAME records to Route 53 for validation
# AWS Console: Route 53 > Hosted Zones > fancy-planties.cloudagrapher.com
# Or use CLI/CDK to add the validation records
```

Wait for certificate status to become "ISSUED" (usually 5-30 minutes).

### Step 3: Update CDK Stack

Update `cdk/stacks/storage_stack.py`:

```python
from aws_cdk import aws_certificatemanager as acm

class ImageStorageStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, env_name: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Import existing SSL certificate from ACM (us-east-1)
        certificate = acm.Certificate.from_certificate_arn(
            self,
            "CloudFrontCertificate",
            certificate_arn="arn:aws:acm:us-east-1:580033881001:certificate/CERT_ID"
        )

        # Create CloudFront distribution with custom domain
        self.distribution = cloudfront.Distribution(
            self,
            "ImageDistribution",
            # ... existing configuration ...

            # Add custom domain configuration
            domain_names=["cdn.fancy-planties.cloudagrapher.com"],
            certificate=certificate,

            # ... rest of configuration ...
        )
```

### Step 4: Deploy CDK Stack

```bash
cd cdk
source .venv/bin/activate
cdk deploy FancyPlantiesStorage-prod --profile stefaws -c environment=prod
```

Note the CloudFront distribution ID from the output.

### Step 5: Create DNS CNAME Record

Add a CNAME record in Route 53:

**Option A: AWS Console**
1. Go to Route 53 > Hosted Zones
2. Select `fancy-planties.cloudagrapher.com`
3. Create Record:
   - Record name: `cdn`
   - Record type: `CNAME`
   - Value: `d2ptipi9zhrqf0.cloudfront.net` (your CloudFront domain)
   - TTL: `300`

**Option B: AWS CLI**
```bash
# Create Route 53 change batch
cat > /tmp/cdn-cname.json <<EOF
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "cdn.fancy-planties.cloudagrapher.com",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "d2ptipi9zhrqf0.cloudfront.net"}]
    }
  }]
}
EOF

# Apply the change
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_HOSTED_ZONE_ID \
  --change-batch file:///tmp/cdn-cname.json \
  --profile stefaws
```

**Option C: CDK (Recommended)**
Update `cdk/stacks/storage_stack.py`:

```python
from aws_cdk import aws_route53 as route53
from aws_cdk import aws_route53_targets as targets

# Import existing hosted zone
hosted_zone = route53.HostedZone.from_lookup(
    self,
    "HostedZone",
    domain_name="fancy-planties.cloudagrapher.com"
)

# Create CNAME record for CloudFront
route53.ARecord(
    self,
    "CdnAliasRecord",
    zone=hosted_zone,
    record_name="cdn",
    target=route53.RecordTarget.from_alias(
        targets.CloudFrontTarget(self.distribution)
    )
)
```

### Step 6: Update Application Configuration

Update `.env.prod`:

```bash
# Change from default CloudFront domain
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=cdn.fancy-planties.cloudagrapher.com

# Keep other settings the same
CLOUDFRONT_PUBLIC_KEY_ID=K2OWI8TFAG01ZW
AWS_API_ENDPOINT=https://sl4zllu188.execute-api.us-east-1.amazonaws.com/dev/
```

### Step 7: Update Cookie Configuration

Update `src/app/api/images/auth-cookie/route.ts`:

```typescript
const cookieOptions = {
  // Use parent domain so cookies work for both app and cdn
  domain: '.fancy-planties.cloudagrapher.com',
  path: '/',
  secure: true, // Always true in production
  httpOnly: true,
  sameSite: 'none' as const,
  maxAge: SEVEN_DAYS_IN_SECONDS,
};
```

### Step 8: Update Image URL Generation

Update `src/lib/services/s3-image-service.ts`:

```typescript
static s3KeyToCloudFrontUrl(s3Key: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    // Development: Use proxy
    return `/api/images/proxy?key=${encodeURIComponent(s3Key)}`;
  }

  // Production with custom domain: Direct CloudFront access
  const cloudfrontDomain = this.getCloudFrontDomain();
  if (!cloudfrontDomain) {
    throw new Error('CloudFront domain not configured');
  }
  return `https://${cloudfrontDomain}/${s3Key}`;
}
```

### Step 9: Deploy Application

```bash
# On production server
git pull origin main

# Rebuild with new environment variables
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

# Check logs
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f app
```

### Step 10: Test and Verify

1. **DNS Propagation**:
   ```bash
   dig cdn.fancy-planties.cloudagrapher.com
   # Should return CNAME to CloudFront domain
   ```

2. **SSL Certificate**:
   ```bash
   curl -I https://cdn.fancy-planties.cloudagrapher.com
   # Should return 200 OK with valid SSL
   ```

3. **Cookie Setting**:
   - Open browser DevTools > Application > Cookies
   - Login to app
   - Should see CloudFront cookies with domain `.fancy-planties.cloudagrapher.com`

4. **Image Loading**:
   - Navigate to dashboard
   - Check Network tab
   - Images should load from `https://cdn.fancy-planties.cloudagrapher.com/users/...`
   - Should see 200 OK (not 403)

5. **Performance**:
   - Images should load faster (direct from CloudFront edge)
   - No proxy overhead

## Cost Impact

**Before (Proxy)**:
- All image traffic goes through your Next.js server
- Data transfer costs on your hosting
- Limited by server bandwidth

**After (Custom Domain)**:
- Images served directly from CloudFront edge locations
- Only CloudFront data transfer costs (~$0.085/GB)
- Global edge locations = faster for all users
- CloudFront Free Tier: 1 TB/month data transfer out

**Estimated Savings**:
For 10,000 monthly image views (avg 200KB each):
- Total data: 2 GB/month
- CloudFront cost: ~$0.17/month (within free tier first year)
- Proxy approach: Uses your server bandwidth (varies by host)

## Rollback Procedure

If issues occur, rollback is simple:

```bash
# 1. Revert environment variable
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=d2ptipi9zhrqf0.cloudfront.net

# 2. Revert code changes
git revert HEAD

# 3. Redeploy
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

The proxy will handle all image requests again.

## Troubleshooting

### Images return 403 Forbidden

**Cause**: Cookies not being sent to CloudFront domain

**Fix**:
1. Check cookie domain in DevTools (should be `.fancy-planties.cloudagrapher.com`)
2. Verify DNS CNAME is correct
3. Clear cookies and login again

### SSL Certificate Errors

**Cause**: Certificate not associated with CloudFront distribution

**Fix**:
1. Verify certificate is in `us-east-1` region
2. Check certificate includes exact domain: `cdn.fancy-planties.cloudagrapher.com`
3. Verify certificate status is "ISSUED"

### DNS Not Resolving

**Cause**: DNS propagation delay or incorrect CNAME

**Fix**:
1. Wait 5-30 minutes for DNS propagation
2. Check CNAME value matches CloudFront domain exactly
3. Clear DNS cache: `sudo dscacheutil -flushcache` (macOS)

## Development vs Production

| Environment | Image URL | Cookie Domain | Direct CloudFront? |
|-------------|-----------|---------------|-------------------|
| Development (localhost:3000) | `/api/images/proxy?key=...` | localhost | No (uses proxy) |
| Production (before custom domain) | `/api/images/proxy?key=...` | fancy-planties.cloudagrapher.com | No (uses proxy) |
| Production (after custom domain) | `https://cdn.fancy-planties.cloudagrapher.com/...` | `.fancy-planties.cloudagrapher.com` | Yes (direct) |

## References

- [CloudFront Custom Domains](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html)
- [CloudFront Signed Cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-cookies.html)
- [ACM Certificate Validation](https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html)
- [Route 53 CNAME Records](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-basic.html#rrsets-values-basic-cname-value)

## Timeline

This setup can be completed in **1-2 hours** including DNS propagation time.

**Quick Checklist**:
- [ ] Request SSL certificate (5 min)
- [ ] Add DNS validation records (5 min)
- [ ] Wait for certificate validation (5-30 min)
- [ ] Update CDK stack (10 min)
- [ ] Deploy CDK (5 min)
- [ ] Create CNAME record (5 min)
- [ ] Update app configuration (10 min)
- [ ] Deploy app (10 min)
- [ ] Test and verify (10 min)
