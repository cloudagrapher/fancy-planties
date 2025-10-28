# S3 Image Storage Migration Guide

## Overview

This guide walks you through migrating from database-stored Base64 images to AWS S3 + CloudFront CDN with secure pre-signed URLs.

## Architecture

### Components

1. **S3 Bucket** - Private storage with Intelligent-Tiering for cost optimization
2. **CloudFront Distribution** - CDN with Origin Access Control (OAC)
3. **Lambda Functions** - Generate pre-signed URLs for uploads/downloads
4. **API Gateway** - Expose Lambda functions as REST API
5. **Next.js API Routes** - Proxy requests with user authentication

### Security

- ✅ S3 bucket completely private (no public access)
- ✅ CloudFront Origin Access Control (OAC) - only CloudFront can access S3
- ✅ Pre-signed URLs expire in 15 minutes
- ✅ User authentication validated in Next.js before generating URLs
- ✅ Row-level security (users can only access their own images)
- ✅ HTTPS enforced via CloudFront

### Cost Optimization

- **S3 Intelligent-Tiering**: Automatically moves objects between access tiers based on usage
- **CloudFront Free Tier**: 1TB/month data transfer + 10M requests
- **Estimated Cost**: ~$0.12-$0.50/month for typical usage (1000 images @ 5MB avg)

## Deployment Steps

### 1. Prerequisites

```bash
# Install AWS CDK
npm install -g aws-cdk

# Install Python dependencies for CDK
cd cdk
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure AWS Credentials

```bash
# Option A: AWS CLI (recommended)
aws configure

# Option B: Environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

### 3. Deploy CDK Infrastructure

```bash
cd cdk

# Bootstrap CDK (first time only)
cdk bootstrap

# Review what will be deployed
cdk synth

# Deploy to AWS
cdk deploy --all

# Save the outputs (API endpoint, S3 bucket, CloudFront domain)
```

### 4. Update Environment Variables

Add the following to `.env.local`:

```bash
# From CDK outputs
AWS_REGION=us-east-1
AWS_S3_BUCKET=fancy-planties-images-dev-123456789012
AWS_API_ENDPOINT=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev
NEXT_PUBLIC_AWS_API_ENDPOINT=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=xxxxxxxxxxxxxx.cloudfront.net

# AWS credentials (if not using IAM roles)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### 5. Run Database Migration

```bash
# Add new s3_image_keys columns to database
npm run db:migrate

# Verify migration was applied
psql $DATABASE_URL -c "\d plant_instances"
```

### 6. Migrate Existing Images to S3

```bash
# Dry run first (recommended)
npx tsx scripts/migrations/migrate-images-to-s3.ts --dry-run

# Migrate all images
npx tsx scripts/migrations/migrate-images-to-s3.ts

# Or migrate specific table
npx tsx scripts/migrations/migrate-images-to-s3.ts --table=plant_instances
```

### 7. Update Application Code

The application code needs to be updated to use S3ImageUpload and S3Image components instead of the old ImageUpload and base64 images.

**Example: Update PlantInstanceForm.tsx**

```tsx
// Before
import ImageUpload from '@/components/shared/ImageUpload';

// After
import S3ImageUpload from '@/components/shared/S3ImageUpload';
import { useSession } from '@/lib/auth/client';

// In component
const { user } = useSession();

<S3ImageUpload
  userId={user.id.toString()}
  entityType="plant_instance"
  entityId={plantInstance.id.toString()}
  onUploadComplete={(s3Keys) => {
    // Update form state with s3Keys
  }}
/>
```

**Example: Display Images**

```tsx
// Before
<img src={base64Image} alt="Plant" />

// After
import S3Image from '@/components/shared/S3Image';

<S3Image
  s3Key={s3Key}
  userId={user.id.toString()}
  alt="Plant"
  width={200}
  height={200}
/>
```

### 8. Deploy Updated Application

```bash
# Build application
npm run build

# Deploy to Unraid
docker compose -f docker-compose.prod.yml up -d
```

## Verification

### 1. Check S3 Bucket

```bash
aws s3 ls s3://fancy-planties-images-dev-123456789012/users/
```

### 2. Test Image Upload

1. Log in to the application
2. Create/edit a plant instance
3. Upload new images
4. Verify images appear correctly
5. Check S3 bucket for new objects

### 3. Test Image Download

1. Navigate to existing plant instances
2. Verify images load correctly
3. Check browser network tab for pre-signed URLs

## Rollback Procedure

If you need to rollback to Base64 images:

1. The Base64 `images` columns are still in the database (not deleted)
2. Comment out S3-related environment variables
3. Revert application code to use old ImageUpload component
4. Redeploy application

## Cleanup (After Verification)

Once you've verified the migration is successful and stable:

### 1. Remove Base64 Images from Database (Optional)

⚠️ **WARNING**: Only do this after thorough verification. This is irreversible.

```sql
-- Remove Base64 images to save database space
UPDATE plant_instances SET images = '[]';
UPDATE propagations SET images = '[]';
UPDATE care_history SET images = '[]';
UPDATE care_guides SET images = '[]';
```

### 2. Monitor Costs

```bash
# Check S3 storage costs
aws s3 ls --summarize --human-readable --recursive s3://fancy-planties-images-dev-123456789012/

# Monitor CloudFront usage in AWS Console
# Cost Explorer > CloudFront
```

## Troubleshooting

### Lambda Function Errors

```bash
# View Lambda logs
aws logs tail /aws/lambda/PresignedUploadFunction --follow
aws logs tail /aws/lambda/PresignedDownloadFunction --follow
```

### S3 Upload Failures

1. Check IAM permissions
2. Verify CORS configuration
3. Check S3 bucket policy
4. Review browser console for errors

### CloudFront 403 Errors

1. Verify Origin Access Control (OAC) is configured
2. Check S3 bucket policy allows CloudFront service principal
3. Wait 15 minutes for CloudFront cache to invalidate

### Migration Script Issues

```bash
# Check environment variables
echo $AWS_S3_BUCKET
echo $DATABASE_URL

# Test AWS credentials
aws sts get-caller-identity

# Run with verbose logging
DEBUG=* npx tsx scripts/migrations/migrate-images-to-s3.ts --dry-run
```

## Cost Monitoring

### Expected Monthly Costs

**Development Environment** (low usage):

- S3 Storage (5GB): ~$0.12/month
- S3 Requests: ~$0.01/month
- CloudFront: Free tier (1TB/month)
- Lambda: Free tier (1M requests/month)
- **Total: ~$0.13-$0.50/month**

**Production Environment** (moderate usage):

- S3 Storage (50GB): ~$1.20/month
- S3 Requests: ~$0.10/month
- CloudFront: Free tier covers most usage
- Lambda: Free tier covers most usage
- **Total: ~$1.30-$3.00/month**

### Cost Optimization Tips

1. **Use Intelligent-Tiering**: Automatically optimizes storage costs (already configured)
2. **Enable CloudFront Caching**: Reduces S3 requests (already configured)
3. **Compress Images**: Use WebP format for smaller file sizes
4. **Set Cache-Control Headers**: Reduce origin requests
5. **Monitor Usage**: Set up AWS Budgets alerts

## Security Best Practices

1. **Never expose S3 bucket publicly**
2. **Always use pre-signed URLs with short expiration**
3. **Validate user permissions before generating URLs**
4. **Use HTTPS only (enforced by CloudFront)**
5. **Enable S3 versioning for data protection** (already configured)
6. **Rotate AWS credentials regularly**
7. **Use IAM roles instead of access keys when possible**

## Additional Resources

- [AWS S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [CloudFront Pricing](https://aws.amazon.com/cloudfront/pricing/)
- [CDK Best Practices](https://docs.aws.amazon.com/cdk/latest/guide/best-practices.html)
- [S3 Pre-signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)
- [CloudFront Origin Access Control](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
