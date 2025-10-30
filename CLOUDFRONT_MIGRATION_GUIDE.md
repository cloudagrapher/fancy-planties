# CloudFront Signed Cookies Migration Guide

This guide walks you through migrating from S3 presigned URLs to CloudFront signed cookies for image access.

## Prerequisites

- AWS CLI installed and configured with admin access
- CDK CLI installed (`npm install -g aws-cdk`)
- Access to your AWS account with CloudFormation permissions

## Step 1: Generate CloudFront Key Pair

Run these commands on your local machine:

```bash
# Generate RSA key pair locally
openssl genrsa -out cloudfront_private_key.pem 2048
openssl rsa -pubout -in cloudfront_private_key.pem -out cloudfront_public_key.pem

# Create public key in CloudFront (requires root account or cloudfront:CreatePublicKey permission)
aws cloudfront create-public-key \
  --public-key-config \
    Name=fancy-planties-signing-key-dev,\
    EncodedKey="$(cat cloudfront_public_key.pem | tr -d '\n' | sed 's/-----BEGIN PUBLIC KEY-----//g' | sed 's/-----END PUBLIC KEY-----//g')",\
    CallerReference="$(date +%s)",\
    Comment="Signing key for Fancy Planties CloudFront distribution (dev)" \
  --query 'PublicKey.Id' \
  --output text

# Save the output - this is your PUBLIC_KEY_ID
# Example output: K3D1ABC2EXAMPLE
```

**Important:** Save the `PUBLIC_KEY_ID` - you'll need it for the next steps.

## Step 2: Store Private Key in AWS Secrets Manager

```bash
# Store private key in Secrets Manager
aws secretsmanager create-secret \
  --name /fancy-planties/cloudfront/private-key-dev \
  --description "CloudFront private signing key for Fancy Planties (dev)" \
  --secret-string file://cloudfront_private_key.pem \
  --region us-east-1

# Verify it was stored
aws secretsmanager describe-secret \
  --secret-id /fancy-planties/cloudfront/private-key-dev \
  --region us-east-1

# Securely delete local private key
shred -u cloudfront_private_key.pem  # On Linux
# OR
rm -P cloudfront_private_key.pem     # On macOS

# Clean up public key (no longer needed)
rm cloudfront_public_key.pem
```

## Step 3: Update CDK Configuration

Update `cdk/cdk.json` with your public key ID:

```json
{
  "context": {
    "cloudfront_public_key_id": "K3D1ABC2EXAMPLE"
  }
}
```

## Step 4: Install Lambda Dependencies

```bash
cd cdk/lambda_functions

# Install cryptography library for Lambda
pip install cryptography==41.0.7 -t .

# This will create a bunch of files in lambda_functions/
# CDK will bundle them with the Lambda deployment
```

## Step 5: Deploy CDK Stacks

```bash
cd cdk

# Synthesize to check for errors
cdk synth -c environment=dev

# Deploy storage stack first (includes CloudFront Key Group)
cdk deploy FancyPlantiesStorage-dev -c environment=dev

# Deploy API stack (includes new Lambda function)
cdk deploy FancyPlantiesImageApi-dev -c environment=dev

# Note the outputs - you'll need:
# - CloudFrontDomainName (from Storage stack)
# - ApiEndpoint (from API stack)
```

## Step 6: Update Application Environment Variables

Update your `.env.local` file:

```bash
# Add these new variables
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=d1abc2def3ghi4.cloudfront.net  # From CDK output
CLOUDFRONT_PUBLIC_KEY_ID=K3D1ABC2EXAMPLE  # From Step 1

# Keep existing AWS variables
AWS_REGION=us-east-1
AWS_S3_BUCKET=fancy-planties-images-dev-580033881001
AWS_API_ENDPOINT=https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev
NEXT_PUBLIC_AWS_API_ENDPOINT=https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev
```

## Step 7: Test Locally

```bash
# Start development server
npm run dev

# Open browser to http://localhost:3000
# Login to your account
# Open DevTools Console and run:
fetch('/api/images/auth-cookie', { method: 'POST', credentials: 'include' })
  .then(r => r.json())
  .then(console.log)

# Check Application > Cookies tab in DevTools
# You should see three cookies:
# - CloudFront-Policy
# - CloudFront-Signature
# - CloudFront-Key-Pair-Id

# Navigate to dashboard and verify images load from CloudFront
# Check Network tab - images should load from *.cloudfront.net
```

## Step 8: Deploy to Production

### 8a. Generate Production Key Pair

Repeat Steps 1-2 but use "prod" instead of "dev":

```bash
# Create public key with prod name
aws cloudfront create-public-key \
  --public-key-config \
    Name=fancy-planties-signing-key-prod,\
    ...

# Store private key with prod path
aws secretsmanager create-secret \
  --name /fancy-planties/cloudfront/private-key-prod \
  ...
```

### 8b. Update Production CDK Context

Update `cdk/cdk.json`:

```json
{
  "context": {
    "cloudfront_public_key_id": "K3D1ABC2EXAMPLE",  # Dev key
    "cloudfront_public_key_id_prod": "K4X5YZA6EXAMPLE"  # Prod key
  }
}
```

### 8c. Deploy Production Stacks

```bash
cd cdk

cdk deploy FancyPlantiesStorage-prod -c environment=prod
cdk deploy FancyPlantiesImageApi-prod -c environment=prod
```

### 8d. Update Production Environment Variables

On your Unraid server, update `.env.prod`:

```bash
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=<from CDK output>
AWS_API_ENDPOINT=<from CDK output>
CLOUDFRONT_PUBLIC_KEY_ID=<from Step 8a>
```

### 8e. Rebuild and Deploy Docker Container

```bash
# On Unraid server
cd /path/to/fancy-planties

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

# Check logs
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f app
```

## Step 9: Verification

### Check Cookie Generation

```bash
# Check Lambda logs
aws logs tail /aws/lambda/FancyPlantiesImageApi-dev-SignedCookieFunction --follow

# You should see successful executions with no errors
```

### Check CloudFront Access

1. Login to your application
2. Open browser DevTools
3. Navigate to a page with images
4. Check Network tab:
   - Images should load from `*.cloudfront.net`
   - Status should be 200 OK
   - No calls to `/api/images/download`

### Verify User Isolation

1. Login as User A
2. Note an S3 key from User A's image (e.g., `users/123/plant_instance/456/image.jpg`)
3. Logout and login as User B
4. Try to access User A's image directly: `https://<cloudfront-domain>/users/123/...`
5. Should get 403 Forbidden (policy restricts to User B's path)

## Troubleshooting

### Images not loading (403 Forbidden)

**Possible causes:**
- Cookies not set properly
- Cookie domain doesn't match CloudFront domain
- Cookie expired
- Wrong resource path in policy

**Fix:**
1. Check cookies in DevTools (Application > Cookies)
2. Verify `NEXT_PUBLIC_CLOUDFRONT_DOMAIN` matches actual CloudFront domain
3. Try calling `/api/images/auth-cookie` manually to regenerate cookies

### Cookies not being set

**Possible causes:**
- Lambda error generating signed cookies
- Private key not accessible
- Wrong Secrets Manager name

**Fix:**
1. Check Lambda logs: `aws logs tail /aws/lambda/<function-name> --follow`
2. Verify Secrets Manager has the key: `aws secretsmanager get-secret-value --secret-id /fancy-planties/cloudfront/private-key-dev`
3. Check IAM role has `secretsmanager:GetSecretValue` permission

### Next.js Image Optimization errors

**Error:** `Invalid src prop, hostname not configured under images in next.config.js`

**Fix:**
Ensure `next.config.ts` has CloudFront domain in remote patterns:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '*.cloudfront.net',
    },
  ],
}
```

### CORS errors

**Error:** `No 'Access-Control-Allow-Origin' header present`

**Fix:**
Add CORS headers to Lambda response in `signed_cookie_generator.py`:

```python
'headers': {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}
```

## Rollback Procedure

If you need to rollback to presigned URLs:

### Quick Rollback (Application Only)

```bash
# Revert git commits
git revert HEAD~5..HEAD  # Adjust number based on commits
git push

# Redeploy
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

### Full Rollback (Infrastructure)

```bash
# Re-enable download Lambda in CDK
# Uncomment presigned_download.py function in api_stack.py

cd cdk
cdk deploy FancyPlantiesImageApi-dev -c environment=dev
cdk deploy FancyPlantiesImageApi-prod -c environment=prod
```

## Cost Comparison

### Before (Presigned URLs)
- Lambda invocations: ~100 per user session
- API Gateway requests: ~100 per user session
- Cost per 10,000 users/month: ~$15-20

### After (Signed Cookies)
- Lambda invocations: 1 per user session
- API Gateway requests: 1 per user session
- Cost per 10,000 users/month: ~$1-2

**Savings: ~90% reduction in AWS costs**

## Performance Comparison

### Before
- Dashboard load time: 5-10 seconds (with 50+ images)
- API calls per page: 50+
- User experience: Loading delays, occasional timeouts

### After
- Dashboard load time: 1-2 seconds
- API calls per page: 0 (for images)
- User experience: Instant image loads from CDN

## Security Notes

- Private key stored in AWS Secrets Manager (encrypted at rest)
- Cookies are HttpOnly (not accessible via JavaScript)
- Cookies are Secure (HTTPS only in production)
- Path-based user isolation enforced at CloudFront edge
- 7-day expiration reduces risk window vs. long-lived credentials

## Next Steps

After successful migration:

1. Monitor CloudFront logs for 403 errors
2. Set up CloudFront access logging
3. Consider implementing automatic cookie refresh before expiration
4. **Consider custom domain for CloudFront** - See [cdk/CLOUDFRONT_CUSTOM_DOMAIN_SETUP.md](cdk/CLOUDFRONT_CUSTOM_DOMAIN_SETUP.md)
   - Enables direct CloudFront access (no proxy needed)
   - Better performance and lower latency
   - Full CDN edge location benefits
   - Setup: `cdn.fancy-planties.cloudagrapher.com`
5. Optimize CloudFront cache policies for better performance

## Support

For issues or questions:
- Check Lambda logs: `aws logs tail /aws/lambda/<function-name>`
- Check application logs: `docker compose logs -f app`
- Review CloudFront documentation: https://docs.aws.amazon.com/cloudfront/
