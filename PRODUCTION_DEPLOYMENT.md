# Production Deployment Guide

This guide covers deploying the latest changes to production on Unraid.

## Prerequisites

- SSH access to Unraid server: `ssh root@192.168.50.18`
- Latest code committed and pushed to GitHub
- Lambda functions deployed (if S3 changes were made)

## Deployment Steps

### 1. Deploy Updated Lambda Functions (if needed)

If you made changes to Lambda functions:

```bash
# From local machine
cd cdk
cdk deploy FancyPlantiesImageApi-dev
```

### 2. Update Environment Variables on Unraid

SSH to Unraid and update the `.env.prod` file:

```bash
ssh root@192.168.50.18
cd /path/to/fancy-planties  # Navigate to your project directory

# Edit .env.prod to ensure these are set:
nano .env.prod
```

Ensure these variables are present:

```bash
# AWS S3 Configuration (for image storage via Lambda)
AWS_REGION=us-east-1
AWS_S3_BUCKET=fancy-planties-images-dev-580033881001
AWS_API_ENDPOINT=https://sl4zllu188.execute-api.us-east-1.amazonaws.com/dev/
NEXT_PUBLIC_AWS_API_ENDPOINT=https://sl4zllu188.execute-api.us-east-1.amazonaws.com/dev/

# IMPORTANT: Do NOT include AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY
# The app uses Lambda functions which have IAM roles
```

### 3. Pull Latest Code and Rebuild

```bash
# Still on Unraid server
cd /path/to/fancy-planties

# Pull latest code from GitHub
git pull origin main

# Stop containers
docker compose -f docker-compose.prod.yml down

# Rebuild the app image with latest code
docker compose -f docker-compose.prod.yml build app

# Start containers
docker compose -f docker-compose.prod.yml up -d

# Watch logs to verify startup
docker compose -f docker-compose.prod.yml logs -f app
```

### 4. Verify Deployment

Check the logs for these indicators:

**✅ Good signs:**
```
✓ Ready in XXXms
[S3 Debug] S3 configured: true
```

**❌ Bad signs:**
```
[S3 Debug] S3 configured: false
AWS_API_ENDPOINT not set
```

### 5. Test Image Upload

1. Navigate to https://fancy-planties.cloudagrapher.com
2. Log in
3. Edit a plant instance
4. Try uploading an image
5. Should see "Uploading to S3..." message
6. Check browser console - should see successful API calls

### 6. Test Image Display

1. Navigate to plants with existing S3 images (e.g., Peperomia Ginny ID 106)
2. Images should load using presigned URLs
3. Check browser Network tab - should see signed S3 URLs

## Troubleshooting

### Images Not Uploading (404 Error)

**Symptom:** Console shows `Failed to load resource: the server responded with a status of 404 (upload)`

**Cause:** API routes not deployed or container using old code

**Fix:**
```bash
# On Unraid
cd /path/to/fancy-planties
git pull origin main
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache app
docker compose -f docker-compose.prod.yml up -d
```

### Images Not Displaying

**Symptom:** No images show in plant cards, console shows S3 URL generation errors

**Cause:** Missing AWS_API_ENDPOINT environment variable

**Fix:**
```bash
# On Unraid
nano .env.prod
# Add:
AWS_API_ENDPOINT=https://sl4zllu188.execute-api.us-east-1.amazonaws.com/dev/
NEXT_PUBLIC_AWS_API_ENDPOINT=https://sl4zllu188.execute-api.us-east-1.amazonaws.com/dev/

# Restart
docker compose -f docker-compose.prod.yml restart app
```

### Database Permission Errors

**Symptom:** Logs show "permission denied" or "relation does not exist"

**Cause:** Database migrations didn't run with proper permissions

**Fix:**
```bash
# On Unraid
docker compose -f docker-compose.prod.yml restart db-migrate
docker compose -f docker-compose.prod.yml logs db-migrate

# Should see:
# ✅ Database initialization complete!
# ✅ Permissions granted to fancy_planties_user
```

### Lambda Functions Not Accessible

**Symptom:** CORS errors or 403 Forbidden from API Gateway

**Cause:** Lambda not deployed or API Gateway permissions

**Fix:**
```bash
# From local machine
cd cdk
cdk deploy FancyPlantiesImageApi-dev

# Verify Lambda is accessible
curl -X POST https://sl4zllu188.execute-api.us-east-1.amazonaws.com/dev/images/download \
  -H "Content-Type: application/json" \
  -d '{"userId": "2", "s3Key": "users/2/plant_instance/106/test.jpg"}'

# Should return presigned URL or error message (not 404)
```

## Quick Reference Commands

```bash
# SSH to Unraid
ssh root@192.168.50.18

# Navigate to project
cd /path/to/fancy-planties

# Update code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f app

# View database logs
docker compose -f docker-compose.prod.yml logs db-migrate

# Check environment
docker compose -f docker-compose.prod.yml exec app env | grep AWS

# Restart just the app (faster)
docker compose -f docker-compose.prod.yml restart app
```

## Rollback Procedure

If deployment causes issues:

```bash
# On Unraid
cd /path/to/fancy-planties

# Check git history
git log --oneline -10

# Rollback to previous commit
git checkout <previous-commit-hash>

# Rebuild
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d
```

## Post-Deployment Checklist

- [ ] App container starts successfully
- [ ] Database migrations complete
- [ ] `[S3 Debug] S3 configured: true` in logs
- [ ] Can log in to the application
- [ ] Existing images load correctly
- [ ] New image upload works
- [ ] Form submission saves plant instances
- [ ] No errors in browser console

## Important Notes

1. **Always test locally first** before deploying to production
2. **The `.env.prod` file is NOT in git** - must be manually updated on server
3. **Database permissions were fixed** - new deployments should work correctly
4. **No AWS credentials in the app** - everything uses Lambda now
5. **Images auto-upload on selection** - no manual upload button

## Need Help?

Check these resources:
- [SECURITY_DEPLOYMENT.md](./SECURITY_DEPLOYMENT.md) - Security changes and credential rotation
- GitHub Actions logs - If using CI/CD
- CloudWatch Logs - For Lambda function errors
- Unraid Docker logs - For container issues
