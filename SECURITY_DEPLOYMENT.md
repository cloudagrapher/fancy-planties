# Security Fix & Deployment Guide

## Overview

This document outlines critical security improvements made to remove AWS credentials from the application and use Lambda functions exclusively for S3 access.

## What Changed

### 1. Removed AWS Credentials from Application

**Before:**
- Next.js app had direct AWS SDK access with `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- Credentials stored in `.env.prod` file
- Security risk of credential leakage

**After:**
- Next.js app proxies all S3 requests through Lambda functions
- Lambda functions use IAM roles (no credentials needed)
- Zero credentials stored in application environment

### 2. Updated Files

#### `.env.prod`
- **Removed:** `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- **Kept:** `AWS_API_ENDPOINT`, `AWS_REGION`, `AWS_S3_BUCKET`

#### `src/lib/utils/s3-url-generator.ts`
- Removed direct AWS SDK client initialization
- Now calls Lambda via API Gateway: `${AWS_API_ENDPOINT}/images/download`
- Extracts userId from S3 key to pass to Lambda
- Updated `isConfigured()` to check for API endpoint instead of credentials

#### `cdk/lambda_functions/presigned_download.py`
- Added support for custom `expiresIn` parameter
- Allows S3UrlGenerator to specify URL expiration time
- Defaults to 900 seconds (15 minutes) if not provided

### 3. Architecture Flow

```
Plant Instances API Route
    ↓
S3UrlGenerator.generatePresignedUrl()
    ↓
Lambda via API Gateway (https://sl4zllu188.execute-api.us-east-1.amazonaws.com/dev/images/download)
    ↓
Lambda validates user ID and S3 key ownership
    ↓
Lambda generates S3 presigned URL using IAM role
    ↓
Returns presigned URL to Next.js
    ↓
Returns to client (expires in 1 hour)
```

## Security Benefits

1. **No Credentials in Application**
   - Zero risk of credential leakage from Docker container
   - No credentials to rotate in application environment
   - Follows AWS security best practices

2. **IAM Role-Based Access**
   - Lambda functions use IAM roles attached to the function
   - Credentials managed by AWS, not by application
   - Automatic credential rotation by AWS

3. **Single Authorization Point**
   - All S3 access goes through Lambda
   - Consistent authorization logic
   - Easier to audit and monitor

4. **Principle of Least Privilege**
   - Application has zero direct AWS access
   - Lambda IAM role scoped to specific S3 bucket operations
   - User isolation enforced at Lambda level

## Critical: Credential Rotation Required

### ⚠️ IMMEDIATE ACTION NEEDED ⚠️

The AWS credentials that were previously in `.env.prod` were exposed during troubleshooting and **MUST be rotated immediately**.

**Note:** Specific credential values are NOT included in this document for security reasons.

### Steps to Rotate Credentials:

1. **Log into AWS Console**
   - Go to IAM → Users
   - Find the IAM user that was used for the application

2. **Deactivate Old Credentials**
   - Go to Security Credentials tab
   - Find the old access key
   - Click "Make inactive"
   - After 24 hours, delete it permanently

3. **Create New Credentials (Optional)**
   - Since the application no longer needs credentials, you may not need new ones
   - If needed for local development or migrations, create new access key
   - Store securely in password manager

4. **Verify No Usage**
   - Check CloudTrail logs for any usage of old credentials
   - Monitor for unauthorized access attempts

## Deployment Instructions

### Prerequisites

- Access to Unraid server at `192.168.50.18`
- Lambda function needs to be redeployed with updated code

### Step 1: Deploy Updated Lambda Function

```bash
# From project root
cd cdk

# Deploy the updated Lambda function
cdk deploy FancyPlantiesImageApi-dev

# Verify deployment
aws lambda get-function --function-name FancyPlantiesImageApi-dev-PresignedDownload
```

### Step 2: Update Unraid Environment

**Option A: Update via docker-compose**

```bash
# SSH to Unraid
ssh root@192.168.50.18

# Navigate to project directory
cd /path/to/fancy-planties

# Pull latest .env.prod from git (if committed)
git pull

# Or manually update .env.prod to remove credentials
nano .env.prod

# Rebuild and restart containers
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Watch logs
docker compose -f docker-compose.prod.yml logs -f app
```

**Option B: Update via Unraid Docker UI**

1. Open Unraid web interface
2. Go to Docker tab
3. Find "fancy-planties-app-prod" container
4. Click "Edit"
5. Remove these environment variables:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
6. Ensure these are present:
   - `AWS_API_ENDPOINT=https://sl4zllu188.execute-api.us-east-1.amazonaws.com/dev/`
   - `AWS_REGION=us-east-1`
   - `AWS_S3_BUCKET=fancy-planties-images-dev-580033881001`
7. Click "Apply"
8. Restart container

### Step 3: Verify Images Load

1. Open https://fancy-planties.cloudagrapher.com
2. Log in
3. Navigate to Plants dashboard
4. Verify images load for plants with S3 images (e.g., Peperomia Ginny ID 106)
5. Check browser console for errors

### Step 4: Monitor Logs

```bash
# On Unraid
docker logs -f fancy-planties-app-prod

# Look for:
# ✅ "[S3 Debug] S3 configured: true"
# ✅ "[S3 Debug] Transforming X keys for instance Y"
# ✅ "[S3 Debug] Generated X URLs for instance Y"

# Should NOT see:
# ❌ "Failed to generate presigned URL"
# ❌ "AWS credentials not configured"
```

## Testing Locally

Before deploying to production, test locally:

```bash
# Update .env.local to remove credentials
# Keep only:
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=fancy-planties-images-dev-580033881001
# AWS_API_ENDPOINT=https://sl4zllu188.execute-api.us-east-1.amazonaws.com/dev/

npm run dev

# Test image loading in browser
# Check console for S3 debug messages
```

## Troubleshooting

### Images Not Loading

**Symptom:** Plant cards show no images

**Check:**
1. Browser console for errors
2. Server logs: `docker logs fancy-planties-app-prod`
3. Lambda logs in CloudWatch
4. API Gateway endpoint is accessible

**Common Issues:**
- `AWS_API_ENDPOINT` not set → Set in environment
- Lambda not deployed → Run `cdk deploy`
- S3 keys format incorrect → Should be `users/{userId}/...`

### Lambda Returns 403

**Symptom:** "Access denied" errors in logs

**Cause:** S3 key doesn't match user ID pattern

**Fix:** Verify S3 keys in database match `users/{userId}/...` format

### Lambda Timeout

**Symptom:** 504 Gateway Timeout errors

**Cause:** Lambda function taking too long to generate URLs

**Fix:**
- Check Lambda CloudWatch logs
- Verify S3 bucket is accessible
- Check Lambda timeout configuration (should be at least 10 seconds)

## Rollback Plan

If issues occur, you can temporarily rollback:

1. **Add credentials back to .env.prod** (not recommended)
2. **Revert code changes:**
   ```bash
   git revert HEAD
   ```
3. **Redeploy container**

However, the new architecture is more secure and should be kept.

## Future Improvements

1. **CloudFront Signed URLs**
   - Currently using S3 presigned URLs
   - CloudFront signed URLs provide better performance
   - Requires private key configuration

2. **Rate Limiting**
   - Add rate limiting to Lambda functions
   - Prevent abuse of presigned URL generation

3. **CloudWatch Alarms**
   - Alert on unusual S3 access patterns
   - Monitor Lambda errors and throttling

4. **Image Virus Scanning**
   - Scan uploaded images for malware
   - Use AWS S3 Object Lambda or separate scanning Lambda

## Questions?

If you encounter issues:
1. Check CloudWatch logs for Lambda errors
2. Verify environment variables in Unraid
3. Test Lambda function directly using AWS Console
4. Check S3 bucket policies and IAM role permissions

## Summary

✅ AWS credentials removed from application
✅ S3UrlGenerator uses Lambda API Gateway
✅ Lambda function updated to accept custom expiration
✅ Zero credentials stored in Docker containers
✅ Follows AWS security best practices

⚠️ **Action Required:** Rotate exposed AWS credentials immediately
