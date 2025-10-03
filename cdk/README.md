# Fancy Planties CDK Infrastructure

This CDK application deploys the AWS infrastructure for secure, cost-effective image storage using S3 + CloudFront.

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │────────▶│  API Gateway │────────▶│   Lambda    │
│             │         │              │         │  Functions  │
└─────────────┘         └──────────────┘         └─────────────┘
                                                         │
                                                         ▼
                        ┌──────────────┐         ┌─────────────┐
                        │  CloudFront  │────────▶│  S3 Bucket  │
                        │ Distribution │   OAC   │  (Private)  │
                        └──────────────┘         └─────────────┘
```

## Stacks

### 1. Storage Stack (`storage_stack.py`)

Creates:
- **S3 Bucket** with Intelligent-Tiering lifecycle policy
- **CloudFront Distribution** with Origin Access Control (OAC)
- Bucket policies for secure access

**Features:**
- Automatic cost optimization with Intelligent-Tiering
- HTTPS-only access
- Versioning enabled for data protection
- CORS configuration for browser uploads

### 2. API Stack (`api_stack.py`)

Creates:
- **Lambda Functions** for pre-signed URL generation
  - `PresignedUploadFunction`: Generate S3 upload URLs
  - `PresignedDownloadFunction`: Generate S3 download URLs
- **API Gateway** REST API
- IAM roles with least-privilege permissions

**Endpoints:**
- `POST /images/upload` - Get pre-signed upload URL
- `POST /images/download` - Get pre-signed download URL

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured (`aws configure`)
3. **Python 3.12+**
4. **AWS CDK CLI** (`npm install -g aws-cdk`)

## Setup

```bash
# Create Python virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate  # Linux/macOS
# OR
.venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

## Deployment Commands

```bash
# Bootstrap CDK (first time only, per account/region)
cdk bootstrap

# Synthesize CloudFormation templates
cdk synth

# View differences from deployed stack
cdk diff

# Deploy all stacks
cdk deploy --all

# Deploy specific stack
cdk deploy FancyPlantiesStorage-dev

# Destroy all resources (DANGER!)
cdk destroy --all
```

## Environment Configuration

Set environment variables before deployment:

```bash
# Required
export CDK_DEFAULT_ACCOUNT=123456789012
export CDK_DEFAULT_REGION=us-east-1

# Optional (defaults to 'dev')
export CDK_ENVIRONMENT=prod
```

Or use CDK context:

```bash
cdk deploy --all --context environment=prod
```

## Outputs

After deployment, save these values to `.env.local`:

- **ImageBucketName**: S3 bucket name
- **CloudFrontDomainName**: CloudFront distribution domain
- **ApiEndpoint**: API Gateway endpoint URL

## Security Features

✅ **S3 Bucket**:
- Private (no public access)
- Server-side encryption (SSE-S3)
- Versioning enabled
- SSL/TLS enforced

✅ **CloudFront**:
- Origin Access Control (OAC)
- HTTPS-only (HTTP redirects to HTTPS)
- HTTP/2 and HTTP/3 enabled

✅ **Lambda Functions**:
- Minimal IAM permissions
- Input validation
- User authorization checks

✅ **API Gateway**:
- CORS enabled
- Throttling configured (100 req/s, 200 burst)
- CloudWatch logging enabled

## Cost Optimization

**Intelligent-Tiering**: Objects automatically move between access tiers
- Frequent Access: $0.023/GB
- Infrequent Access: $0.0125/GB
- Archive Access: $0.004/GB

**CloudFront**: Free tier includes:
- 1 TB/month data transfer
- 10M HTTP/HTTPS requests
- 2M CloudFront Function invocations

**Lambda**: Free tier includes:
- 1M requests/month
- 400,000 GB-seconds compute

**Expected Cost**: $0.12-$3.00/month depending on usage

## CDK Nag (Security Validation)

This project uses CDK Nag to validate security best practices.

**Intentional Suppressions**:
- `AwsSolutions-S1`: S3 access logs not required for this use case
- `AwsSolutions-APIG2`: Request validation performed in Lambda
- `AwsSolutions-APIG4`: Authorization performed in Next.js API routes
- `AwsSolutions-IAM4`: Standard Lambda execution role is appropriate

## Development

### Stack Structure

```
cdk/
├── app.py                    # CDK app entry point
├── stacks/
│   ├── __init__.py
│   ├── storage_stack.py      # S3 + CloudFront
│   └── api_stack.py          # Lambda + API Gateway
├── lambda_functions/
│   ├── presigned_upload.py   # Upload URL generator
│   └── presigned_download.py # Download URL generator
├── requirements.txt          # Python dependencies
└── cdk.json                  # CDK configuration
```

### Lambda Function Development

Lambda functions are in `lambda_functions/` directory:

**Environment Variables**:
- `BUCKET_NAME`: S3 bucket name
- `CLOUDFRONT_DOMAIN`: CloudFront distribution domain
- `URL_EXPIRATION`: Pre-signed URL expiration (seconds, default: 900)

**Testing Locally**:
```bash
# Install dependencies
pip install boto3

# Set environment variables
export BUCKET_NAME=test-bucket
export URL_EXPIRATION=900

# Run function locally (requires AWS credentials)
python lambda_functions/presigned_upload.py
```

### Updating Stacks

1. Modify stack code in `stacks/`
2. Run `cdk diff` to preview changes
3. Run `cdk deploy --all` to apply changes

### Adding New Resources

1. Edit appropriate stack file
2. Add CDK constructs
3. Add outputs if needed
4. Run `cdk synth` to validate
5. Deploy with `cdk deploy`

## Monitoring

### CloudWatch Logs

Lambda function logs:
```bash
aws logs tail /aws/lambda/PresignedUploadFunction --follow
aws logs tail /aws/lambda/PresignedDownloadFunction --follow
```

API Gateway logs:
```bash
aws logs tail /aws/apigateway/fancy-planties-image-api-dev/dev --follow
```

### Metrics

View metrics in AWS Console:
- **S3**: Storage size, request count
- **CloudFront**: Requests, data transfer, cache hit ratio
- **Lambda**: Invocations, duration, errors
- **API Gateway**: Request count, latency, 4xx/5xx errors

## Troubleshooting

### CDK Bootstrap Issues

```bash
# Check bootstrap status
aws cloudformation describe-stacks --stack-name CDKToolkit

# Re-bootstrap if needed
cdk bootstrap --force
```

### Deployment Errors

```bash
# View CloudFormation events
aws cloudformation describe-stack-events --stack-name FancyPlantiesStorage-dev

# Check CDK context
cdk context --clear
```

### Permission Issues

Ensure your AWS user/role has:
- CloudFormation full access
- S3 full access
- CloudFront full access
- Lambda full access
- API Gateway full access
- IAM limited access (create roles/policies)

## Cleanup

To remove all resources:

```bash
# Destroy all stacks
cdk destroy --all

# Empty S3 bucket first if auto-delete is disabled
aws s3 rm s3://fancy-planties-images-dev-123456789012 --recursive
```

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [CDK Python Reference](https://docs.aws.amazon.com/cdk/api/v2/python/)
- [CDK Best Practices](https://docs.aws.amazon.com/cdk/latest/guide/best-practices.html)
- [AWS Solutions Constructs](https://aws.amazon.com/solutions/constructs/)
