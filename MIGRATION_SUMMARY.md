# Image Storage Migration: Database → S3 + CloudFront

## ✅ Migration Complete

All infrastructure and application code has been created for migrating from database-stored Base64 images to AWS S3 + CloudFront CDN.

## 📁 Files Created

### CDK Infrastructure (Python)
```
cdk/
├── app.py                              # CDK application entry point
├── cdk.json                            # CDK configuration
├── requirements.txt                    # Python dependencies
├── .gitignore                          # CDK-specific gitignore
├── README.md                           # CDK documentation
├── stacks/
│   ├── __init__.py
│   ├── storage_stack.py               # S3 + CloudFront stack
│   └── api_stack.py                   # Lambda + API Gateway stack
└── lambda_functions/
    ├── presigned_upload.py            # Generate upload URLs
    └── presigned_download.py          # Generate download URLs
```

### Database Migration
```
src/lib/db/schema.ts                   # Added s3ImageKeys columns
drizzle/0004_goofy_the_captain.sql    # Generated migration SQL
```

### Application Services
```
src/lib/services/s3-image-service.ts   # S3 integration service
src/app/api/images/upload/route.ts     # Upload URL API endpoint
src/app/api/images/download/route.ts   # Download URL API endpoint
```

### React Components
```
src/components/shared/S3Image.tsx          # Display S3 images
src/components/shared/S3ImageUpload.tsx    # Upload to S3
```

### Migration Script
```
scripts/migrations/migrate-images-to-s3.ts # Move Base64 → S3
```

### Documentation
```
docs/S3_MIGRATION_GUIDE.md             # Complete migration guide
cdk/README.md                          # CDK infrastructure docs
.env.example                           # Updated with AWS vars
MIGRATION_SUMMARY.md                   # This file
```

## 🏗️ Architecture

```
User Browser
     │
     ├──▶ Next.js App (Unraid)
     │    ├──▶ /api/images/upload ─────┐
     │    └──▶ /api/images/download ───┤
     │                                  │
     └──▶ CloudFront (CDN) ────────────┤
          │                             │
          │ (OAC)                       │
          ▼                             ▼
     S3 Bucket ◀────────────── Lambda Functions
     (Private)                  (Pre-signed URLs)
                                       ▲
                                       │
                                 API Gateway
```

## 💰 Cost Analysis

**Monthly Cost Estimate** (1000 images @ 5MB average):

| Service | Usage | Cost |
|---------|-------|------|
| S3 Storage | 5GB Intelligent-Tiering | ~$0.12 |
| S3 Requests | PUT/GET | ~$0.01 |
| CloudFront | 1TB free tier | $0.00 |
| Lambda | Free tier | $0.00 |
| API Gateway | Free tier | $0.00 |
| **TOTAL** | | **~$0.13/month** |

**Benefits vs Database Storage:**
- ✅ Reduced database size → faster queries
- ✅ Offloaded image serving to CDN
- ✅ Automatic cost optimization (Intelligent-Tiering)
- ✅ Better scalability
- ✅ Global CDN distribution

## 🔒 Security Features

1. **Private S3 Bucket** - No public access
2. **Origin Access Control (OAC)** - Only CloudFront can access S3
3. **Pre-signed URLs** - Expire in 15 minutes
4. **User Authentication** - Validated in Next.js before URL generation
5. **Row-level Security** - Users only access their own images
6. **HTTPS Only** - Enforced via CloudFront
7. **Server-side Encryption** - All objects encrypted at rest

## 🚀 Deployment Steps

### 1. Deploy CDK Infrastructure

```bash
cd cdk

# Create Python virtual environment
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy to AWS
cdk deploy --all

# Save the outputs!
```

### 2. Update Environment Variables

Add to `.env.local`:

```bash
AWS_REGION=us-east-1
AWS_S3_BUCKET=<from CDK output>
AWS_API_ENDPOINT=<from CDK output>
NEXT_PUBLIC_AWS_API_ENDPOINT=<from CDK output>
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=<from CDK output>
AWS_ACCESS_KEY_ID=<your key>
AWS_SECRET_ACCESS_KEY=<your secret>
```

### 3. Run Database Migration

```bash
# Apply schema changes
npm run db:migrate
```

### 4. Migrate Existing Images

```bash
# Test with dry run
npx tsx scripts/migrations/migrate-images-to-s3.ts --dry-run

# Run actual migration
npx tsx scripts/migrations/migrate-images-to-s3.ts
```

### 5. Update Application Components

Update components to use new S3 image components:
- Replace `ImageUpload` with `S3ImageUpload`
- Replace `<img src={base64}>` with `<S3Image s3Key={key}>`

See `docs/S3_MIGRATION_GUIDE.md` for examples.

### 6. Test & Verify

1. Upload new images → Check S3 bucket
2. View existing images → Verify they load
3. Monitor CloudWatch logs for errors

### 7. Deploy to Production

```bash
npm run build
docker compose -f docker-compose.prod.yml up -d
```

## 🔄 Rollback Plan

If issues occur:

1. **Base64 images still in database** (not deleted)
2. **Comment out AWS env vars** in `.env.local`
3. **Revert to old components** (ImageUpload)
4. **Redeploy application**

## 📊 Migration Script Features

The migration script (`scripts/migrations/migrate-images-to-s3.ts`):

✅ Processes all tables with images
✅ Converts Base64 to Buffer
✅ Uploads to S3 with user-specific paths
✅ Updates database with S3 keys
✅ Keeps original Base64 for rollback
✅ Supports dry-run mode
✅ Provides detailed statistics
✅ Error handling and logging

**Usage:**
```bash
# Dry run (no changes)
npx tsx scripts/migrations/migrate-images-to-s3.ts --dry-run

# Migrate all tables
npx tsx scripts/migrations/migrate-images-to-s3.ts

# Migrate specific table
npx tsx scripts/migrations/migrate-images-to-s3.ts --table=plant_instances
```

## 🎯 Next Steps

1. **Deploy CDK infrastructure to AWS**
2. **Update `.env.local` with outputs**
3. **Run database migration**
4. **Test migration script with --dry-run**
5. **Run actual migration**
6. **Update application components**
7. **Test thoroughly**
8. **Deploy to production**
9. **Monitor for 1-2 weeks**
10. **Optional: Remove Base64 from DB** (after verification)

## 📚 Documentation

- **Complete Guide**: `docs/S3_MIGRATION_GUIDE.md`
- **CDK Docs**: `cdk/README.md`
- **AWS Resources**: See migration guide

## ⚠️ Important Notes

1. **Base64 images not deleted** - Kept for rollback capability
2. **Test thoroughly** before production deployment
3. **Monitor AWS costs** via Cost Explorer
4. **Set up billing alerts** to avoid surprises
5. **Use dry-run** before actual migration
6. **Backup database** before migration

## 🎉 Benefits

✨ **Performance**: CDN-delivered images load faster
✨ **Cost**: ~$0.13/month vs database bloat
✨ **Security**: Private S3 with pre-signed URLs
✨ **Scalability**: CloudFront global distribution
✨ **Reliability**: S3 99.999999999% durability
✨ **Maintainability**: Clean separation of concerns

---

**Ready to migrate!** Follow the deployment steps above or consult `docs/S3_MIGRATION_GUIDE.md` for detailed instructions.
