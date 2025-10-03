"""
Lambda function to generate pre-signed download URLs for S3
Validates user authorization before generating download URLs
"""
import json
import os
import boto3
from botocore.exceptions import ClientError

s3_client = boto3.client('s3')
cloudfront_client = boto3.client('cloudfront')
BUCKET_NAME = os.environ['BUCKET_NAME']
CLOUDFRONT_DOMAIN = os.environ.get('CLOUDFRONT_DOMAIN', '')
URL_EXPIRATION = int(os.environ.get('URL_EXPIRATION', '900'))  # 15 minutes default


def lambda_handler(event, context):
    """
    Generate a pre-signed URL for downloading an image

    Expected input:
    {
        "userId": "123",
        "s3Key": "users/123/plant_instance/456/uuid.jpg"
    }
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('userId')
        s3_key = body.get('s3Key')

        # Validate required fields
        if not all([user_id, s3_key]):
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Missing required fields: userId, s3Key'
                })
            }

        # Validate user owns this object (s3Key should start with users/{userId}/)
        expected_prefix = f"users/{user_id}/"
        if not s3_key.startswith(expected_prefix):
            return {
                'statusCode': 403,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Access denied: You do not have permission to access this image'
                })
            }

        # Check if object exists
        try:
            s3_client.head_object(Bucket=BUCKET_NAME, Key=s3_key)
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'error': 'Image not found'
                    })
                }
            raise

        # Generate pre-signed URL
        # If CloudFront domain is configured, generate CloudFront signed URL
        # Otherwise, generate S3 pre-signed URL
        if CLOUDFRONT_DOMAIN:
            # For now, use S3 pre-signed URL
            # CloudFront signed URLs require private key configuration
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': BUCKET_NAME,
                    'Key': s3_key,
                },
                ExpiresIn=URL_EXPIRATION
            )
        else:
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': BUCKET_NAME,
                    'Key': s3_key,
                },
                ExpiresIn=URL_EXPIRATION
            )

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'url': presigned_url,
                's3Key': s3_key,
                'expiresIn': URL_EXPIRATION,
                'message': 'Download URL generated successfully'
            })
        }

    except ClientError as e:
        print(f"AWS ClientError: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': 'Failed to generate download URL'
            })
        }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': 'Internal server error'
            })
        }
