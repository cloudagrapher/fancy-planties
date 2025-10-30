# CloudFront Keys Configuration (Development)

**Generated:** 2025-10-30

## Key Information

### Public Key
- **Public Key ID:** `K2OWI8TFAG01ZW`
- **Name:** `fancy-planties-signing-key-dev`
- **Location:** CloudFront Console > Security > Public keys

### Key Group
- **Key Group ID:** `6bfe7dc8-11f5-4d3b-bb01-0c7a653a17a6`
- **Name:** `fancy-planties-key-group-dev`
- **Location:** CloudFront Console > Security > Key groups

### Private Key
- **Location:** AWS Secrets Manager
- **Secret Name:** `/fancy-planties/cloudfront/private-key-dev`
- **Region:** us-east-1
- **ARN:** `arn:aws:secretsmanager:us-east-1:580033881001:secret:/fancy-planties/cloudfront/private-key-dev-lzYUrm`

## CDK Configuration

Updated in [cdk.json](cdk.json):
```json
{
  "context": {
    "cloudfront_public_key_id": "K2OWI8TFAG01ZW",
    "cloudfront_key_group_id": "6bfe7dc8-11f5-4d3b-bb01-0c7a653a17a6"
  }
}
```

## Security Notes

- Private key stored securely in AWS Secrets Manager (encrypted at rest)
- Local private key files have been securely deleted using `rm -P`
- Public key registered with CloudFront
- Key group created and ready for CloudFront distribution association

## Next Steps

Follow the migration guide [CLOUDFRONT_MIGRATION_GUIDE.md](../CLOUDFRONT_MIGRATION_GUIDE.md):

1. ✅ Step 1: Generate CloudFront Key Pair - COMPLETE
2. ✅ Step 2: Store Private Key in Secrets Manager - COMPLETE
3. ✅ Step 3: Update CDK Configuration - COMPLETE
4. ⏳ Step 4: Install Lambda Dependencies
5. ⏳ Step 5: Deploy CDK Stacks
6. ⏳ Step 6: Update Application Environment Variables
7. ⏳ Step 7: Test Locally
8. ⏳ Step 8: Deploy to Production

## Verification Commands

```bash
# Verify secret exists
aws secretsmanager describe-secret \
  --secret-id /fancy-planties/cloudfront/private-key-dev \
  --region us-east-1

# Verify public key
aws cloudfront get-public-key --id K2OWI8TFAG01ZW

# Verify key group
aws cloudfront get-key-group --id 6bfe7dc8-11f5-4d3b-bb01-0c7a653a17a6
```

## Troubleshooting

If you need to retrieve the private key (use with caution):
```bash
aws secretsmanager get-secret-value \
  --secret-id /fancy-planties/cloudfront/private-key-dev \
  --region us-east-1 \
  --query SecretString \
  --output text
```

## Production Keys

When ready for production, repeat the process with:
- Secret name: `/fancy-planties/cloudfront/private-key-prod`
- Public key name: `fancy-planties-signing-key-prod`
- Key group name: `fancy-planties-key-group-prod`
