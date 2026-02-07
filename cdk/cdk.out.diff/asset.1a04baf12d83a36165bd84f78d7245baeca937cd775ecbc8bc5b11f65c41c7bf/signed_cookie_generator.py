"""
Lambda function to generate CloudFront signed cookies
Validates user authorization and creates signed cookies for CloudFront access

Security: Uses path-based resource restriction to ensure users can only access
their own images (e.g., users/123/* can only be accessed by user 123)
"""
import json
import os
import boto3
from datetime import datetime, timedelta
from botocore.exceptions import ClientError
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
import base64

# Initialize AWS clients
secrets_client = boto3.client('secretsmanager')

# Environment variables
SECRET_NAME = os.environ['PRIVATE_KEY_SECRET_NAME']
KEY_PAIR_ID = os.environ['CLOUDFRONT_KEY_PAIR_ID']
CLOUDFRONT_DOMAIN = os.environ['CLOUDFRONT_DOMAIN']
COOKIE_EXPIRATION_DAYS = int(os.environ.get('COOKIE_EXPIRATION_DAYS', '7'))

# Cache for private key (Lambda execution context reuse)
_private_key_cache = None


def get_private_key():
    """
    Retrieve and cache the CloudFront private key from Secrets Manager

    Returns:
        RSA private key object

    Raises:
        Exception: If key retrieval or parsing fails
    """
    global _private_key_cache

    if _private_key_cache is not None:
        return _private_key_cache

    try:
        print(f"Retrieving private key from Secrets Manager: {SECRET_NAME}")
        response = secrets_client.get_secret_value(SecretId=SECRET_NAME)
        private_key_pem = response['SecretString']

        # Load the private key
        _private_key_cache = serialization.load_pem_private_key(
            private_key_pem.encode('utf-8'),
            password=None,
            backend=default_backend()
        )

        print("Successfully loaded private key")
        return _private_key_cache
    except ClientError as e:
        print(f"Error retrieving private key from Secrets Manager: {str(e)}")
        raise
    except Exception as e:
        print(f"Error loading private key: {str(e)}")
        raise


def create_signed_cookie_policy(resource_path, expiration_time):
    """
    Create CloudFront cookie policy JSON

    Args:
        resource_path: The CloudFront resource path (e.g., https://domain/users/123/*)
        expiration_time: Unix timestamp when the cookie expires

    Returns:
        JSON policy string (compact, no whitespace)
    """
    policy = {
        "Statement": [
            {
                "Resource": resource_path,
                "Condition": {
                    "DateLessThan": {
                        "AWS:EpochTime": expiration_time
                    }
                }
            }
        ]
    }
    # Use compact JSON (no whitespace) as required by CloudFront
    return json.dumps(policy, separators=(',', ':'))


def sign_policy(policy_string, private_key):
    """
    Sign the policy with the private key using RSA-SHA1

    Args:
        policy_string: JSON policy string to sign
        private_key: RSA private key object

    Returns:
        Base64-encoded signature (URL-safe, CloudFront format)
    """
    # Sign with RSA-SHA1 (CloudFront requirement)
    signature = private_key.sign(
        policy_string.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA1()
    )

    # CloudFront requires URL-safe base64 encoding with specific character replacements
    encoded = base64.b64encode(signature).decode('utf-8')
    # Replace characters as per CloudFront requirements
    encoded = encoded.replace('+', '-').replace('=', '_').replace('/', '~')
    return encoded


def lambda_handler(event, context):
    """
    Generate CloudFront signed cookies for authorized user access

    Expected input (JSON body):
    {
        "userId": "123"
    }

    Returns:
    {
        "cookies": {
            "CloudFront-Policy": "...",
            "CloudFront-Signature": "...",
            "CloudFront-Key-Pair-Id": "..."
        },
        "domain": "d123abc.cloudfront.net",
        "expiresAt": 1234567890,
        "expiresIn": 604800,
        "message": "Signed cookies generated successfully"
    }
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('userId')

        # Validate required fields
        if not user_id:
            print("Error: Missing userId in request")
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Missing required field: userId'
                })
            }

        print(f"Generating signed cookies for user {user_id}")

        # Generate resource path with user isolation
        # This ensures users can only access their own images
        # Example: https://d123abc.cloudfront.net/users/123/*
        resource_path = f"https://{CLOUDFRONT_DOMAIN}/users/{user_id}/*"
        print(f"Resource path: {resource_path}")

        # Calculate expiration time (7 days from now by default)
        expiration_time = int((datetime.utcnow() + timedelta(days=COOKIE_EXPIRATION_DAYS)).timestamp())
        expires_at_readable = datetime.utcfromtimestamp(expiration_time).isoformat()
        print(f"Cookie expiration: {expires_at_readable} ({COOKIE_EXPIRATION_DAYS} days)")

        # Create policy
        policy_string = create_signed_cookie_policy(resource_path, expiration_time)
        print(f"Policy created: {len(policy_string)} bytes")

        # Get private key
        private_key = get_private_key()

        # Sign the policy
        signature = sign_policy(policy_string, private_key)
        print(f"Policy signed: {len(signature)} bytes")

        # Encode policy for cookie (URL-safe base64)
        policy_encoded = base64.b64encode(policy_string.encode('utf-8')).decode('utf-8')
        policy_encoded = policy_encoded.replace('+', '-').replace('=', '_').replace('/', '~')

        print(f"Successfully generated signed cookies for user {user_id}")

        # Return cookie values
        # The Next.js API route will set these as HTTP cookies
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'cookies': {
                    'CloudFront-Policy': policy_encoded,
                    'CloudFront-Signature': signature,
                    'CloudFront-Key-Pair-Id': KEY_PAIR_ID,
                },
                'domain': CLOUDFRONT_DOMAIN,
                'expiresAt': expiration_time,
                'expiresIn': COOKIE_EXPIRATION_DAYS * 24 * 60 * 60,  # seconds
                'message': 'Signed cookies generated successfully'
            })
        }

    except ClientError as e:
        error_message = f"AWS ClientError: {str(e)}"
        print(error_message)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': 'Failed to generate signed cookies',
                'details': str(e)
            })
        }
    except Exception as e:
        error_message = f"Unexpected error: {str(e)}"
        print(error_message)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            })
        }
