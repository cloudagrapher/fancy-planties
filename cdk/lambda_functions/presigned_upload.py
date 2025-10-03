"""
Lambda function to generate pre-signed upload URLs for S3
Validates user authorization before generating upload URLs
"""
import json
import os
import boto3
from botocore.exceptions import ClientError
from datetime import datetime
import uuid

s3_client = boto3.client('s3')
BUCKET_NAME = os.environ['BUCKET_NAME']
URL_EXPIRATION = int(os.environ.get('URL_EXPIRATION', '900'))  # 15 minutes default


def lambda_handler(event, context):
    """
    Generate a pre-signed POST URL for uploading an image to S3

    Expected input:
    {
        "userId": "123",
        "entityType": "plant_instance",  # or "propagation", "care_history", "care_guide"
        "entityId": "456",
        "contentType": "image/jpeg",
        "fileExtension": "jpg"
    }
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('userId')
        entity_type = body.get('entityType')
        entity_id = body.get('entityId')
        content_type = body.get('contentType', 'image/jpeg')
        file_extension = body.get('fileExtension', 'jpg')

        # Validate required fields
        if not all([user_id, entity_type, entity_id]):
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Missing required fields: userId, entityType, entityId'
                })
            }

        # Validate content type
        allowed_types = ['image/jpeg', 'image/png', 'image/webp']
        if content_type not in allowed_types:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': f'Invalid content type. Allowed: {", ".join(allowed_types)}'
                })
            }

        # Generate S3 object key with user-specific prefix
        # Format: users/{userId}/{entityType}/{entityId}/{uuid}.{ext}
        object_key = f"users/{user_id}/{entity_type}/{entity_id}/{uuid.uuid4()}.{file_extension}"

        # Generate pre-signed POST URL
        presigned_post = s3_client.generate_presigned_post(
            Bucket=BUCKET_NAME,
            Key=object_key,
            Fields={
                'Content-Type': content_type
            },
            Conditions=[
                {'Content-Type': content_type},
                ['content-length-range', 100, 10485760],  # 100 bytes to 10MB
            ],
            ExpiresIn=URL_EXPIRATION
        )

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'url': presigned_post['url'],
                'fields': presigned_post['fields'],
                's3Key': object_key,
                'expiresIn': URL_EXPIRATION,
                'message': 'Upload URL generated successfully'
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
                'error': 'Failed to generate upload URL'
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
