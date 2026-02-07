"""
Lambda function to generate thumbnails from uploaded images.
Triggered by S3 PutObject events on image uploads.
Generates 4 WebP thumbnails at different sizes.
"""
import json
import os
import io
import logging
from typing import Dict, List, Tuple, Optional
from urllib.parse import unquote_plus

import boto3
from botocore.exceptions import ClientError
from PIL import Image, ImageOps

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize S3 client
s3_client = boto3.client('s3')
BUCKET_NAME = os.environ['BUCKET_NAME']

# Thumbnail configurations: (width, height, subdirectory_name)
THUMBNAIL_CONFIGS: List[Tuple[int, int, str]] = [
    (64, 64, 'thumb-64'),    # 64x64 center-crop (profile pics)
    (200, 150, 'thumb-200'),  # 200x150 cover-fit (list views)
    (300, 300, 'thumb-300'),  # 300x300 cover-fit (grid views)
    (400, 300, 'thumb-400'),  # 400x300 cover-fit (detail views)
]

# Maximum image size to process (prevent memory exhaustion)
MAX_IMAGE_SIZE_MB = 20

# Supported input formats
SUPPORTED_FORMATS = {'.jpg', '.jpeg', '.png', '.webp'}


def lambda_handler(event: Dict, context: Dict) -> Dict:
    """
    Process S3 event and generate thumbnails for uploaded images.

    Args:
        event: S3 event notification with bucket and object information
        context: Lambda context object

    Returns:
        Response dict with statusCode and processing results
    """
    try:
        # Process each record in the S3 event
        results = []
        for record in event.get('Records', []):
            try:
                result = process_s3_record(record)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to process record: {str(e)}", exc_info=True)
                # Continue processing other records even if one fails
                results.append({
                    'success': False,
                    'error': str(e)
                })

        # Log summary
        success_count = sum(1 for r in results if r.get('success', False))
        logger.info(f"Processed {len(results)} records: {success_count} successful")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Processed {len(results)} records',
                'successful': success_count,
                'total': len(results)
            })
        }

    except Exception as e:
        logger.error(f"Lambda handler error: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Failed to process thumbnails'
            })
        }


def process_s3_record(record: Dict) -> Dict:
    """
    Process a single S3 event record and generate thumbnails.

    Args:
        record: S3 event record containing bucket and object information

    Returns:
        Dict with processing results and thumbnail keys

    Raises:
        ValueError: If the object key is invalid or should be skipped
        ClientError: If S3 operations fail
    """
    # Extract bucket and object information
    bucket = record['s3']['bucket']['name']
    key = unquote_plus(record['s3']['object']['key'])

    logger.info(f"Processing image: s3://{bucket}/{key}")

    # CRITICAL: Guard against recursive triggers
    # Skip if this is already a thumbnail
    if '/thumb-' in key:
        logger.info(f"Skipping thumbnail file: {key}")
        return {
            'success': True,
            'skipped': True,
            'reason': 'Already a thumbnail'
        }

    # Validate file extension
    file_ext = os.path.splitext(key)[1].lower()
    if file_ext not in SUPPORTED_FORMATS:
        logger.warning(f"Unsupported format {file_ext} for key: {key}")
        return {
            'success': True,
            'skipped': True,
            'reason': f'Unsupported format: {file_ext}'
        }

    # Validate key structure (should match: users/{userId}/{entityType}/{entityId}/{uuid}.{ext})
    key_parts = key.split('/')
    if len(key_parts) < 5 or key_parts[0] != 'users':
        logger.warning(f"Invalid key structure: {key}")
        return {
            'success': True,
            'skipped': True,
            'reason': 'Invalid key structure'
        }

    # Download original image from S3
    try:
        response = s3_client.get_object(Bucket=bucket, Key=key)
        image_data = response['Body'].read()
        content_type = response.get('ContentType', 'image/jpeg')
    except ClientError as e:
        error_code = e.response['Error']['Code']
        logger.error(f"Failed to download image {key}: {error_code}")
        raise

    # Check image size
    image_size_mb = len(image_data) / (1024 * 1024)
    if image_size_mb > MAX_IMAGE_SIZE_MB:
        logger.warning(f"Image too large ({image_size_mb:.2f}MB): {key}")
        return {
            'success': True,
            'skipped': True,
            'reason': f'Image too large: {image_size_mb:.2f}MB'
        }

    # Generate thumbnails
    thumbnail_keys = generate_thumbnails(bucket, key, image_data)

    logger.info(f"Generated {len(thumbnail_keys)} thumbnails for {key}")

    return {
        'success': True,
        'original_key': key,
        'thumbnails': thumbnail_keys
    }


def generate_thumbnails(bucket: str, original_key: str, image_data: bytes) -> List[str]:
    """
    Generate all thumbnail variations from the original image.

    Args:
        bucket: S3 bucket name
        original_key: Original image S3 key
        image_data: Original image binary data

    Returns:
        List of S3 keys for generated thumbnails

    Raises:
        Exception: If thumbnail generation or upload fails
    """
    # Parse original key to construct thumbnail paths
    # Format: users/{userId}/{entityType}/{entityId}/{filename}.{ext}
    key_parts = original_key.rsplit('/', 1)
    base_path = key_parts[0]  # users/{userId}/{entityType}/{entityId}
    filename = key_parts[1]   # {uuid}.{ext}
    filename_without_ext = os.path.splitext(filename)[0]

    # Load original image
    try:
        image = Image.open(io.BytesIO(image_data))
        # Apply EXIF orientation (phone photos store rotation as metadata)
        image = ImageOps.exif_transpose(image)
        # Convert to RGB if necessary (handle RGBA, P, etc.)
        if image.mode not in ('RGB', 'RGBA'):
            image = image.convert('RGBA' if image.mode == 'LA' else 'RGB')
    except Exception as e:
        logger.error(f"Failed to load image {original_key}: {str(e)}")
        raise ValueError(f"Invalid image format: {str(e)}")

    logger.info(f"Original image size: {image.size}, mode: {image.mode}")

    # Generate each thumbnail size
    thumbnail_keys = []
    for width, height, subdir_name in THUMBNAIL_CONFIGS:
        try:
            thumbnail_key = create_thumbnail(
                image=image,
                bucket=bucket,
                base_path=base_path,
                filename_without_ext=filename_without_ext,
                subdir_name=subdir_name,
                target_width=width,
                target_height=height
            )
            thumbnail_keys.append(thumbnail_key)
        except Exception as e:
            # Log error but continue with other thumbnails
            logger.error(f"Failed to generate {subdir_name} thumbnail: {str(e)}")

    return thumbnail_keys


def create_thumbnail(
    image: Image.Image,
    bucket: str,
    base_path: str,
    filename_without_ext: str,
    subdir_name: str,
    target_width: int,
    target_height: int
) -> str:
    """
    Create and upload a single thumbnail.

    Uses cover-fit strategy: scales the image to cover the target dimensions
    while maintaining aspect ratio, then crops to fit exactly.

    Args:
        image: PIL Image object
        bucket: S3 bucket name
        base_path: Base path (users/{userId}/{entityType}/{entityId})
        filename_without_ext: Original filename without extension
        subdir_name: Thumbnail subdirectory name (e.g., 'thumb-200')
        target_width: Target thumbnail width
        target_height: Target thumbnail height

    Returns:
        S3 key of uploaded thumbnail

    Raises:
        Exception: If thumbnail creation or upload fails
    """
    # Calculate scaling to cover target dimensions
    img_width, img_height = image.size
    scale_width = target_width / img_width
    scale_height = target_height / img_height
    scale = max(scale_width, scale_height)  # Cover-fit: use larger scale

    # Calculate new dimensions after scaling
    new_width = int(img_width * scale)
    new_height = int(img_height * scale)

    # Resize image (high-quality Lanczos resampling)
    resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

    # Center crop to exact target dimensions
    left = (new_width - target_width) // 2
    top = (new_height - target_height) // 2
    right = left + target_width
    bottom = top + target_height
    cropped = resized.crop((left, top, right, bottom))

    # Convert RGBA to RGB for WebP encoding (with white background)
    if cropped.mode == 'RGBA':
        background = Image.new('RGB', cropped.size, (255, 255, 255))
        background.paste(cropped, mask=cropped.split()[3])  # Use alpha channel as mask
        cropped = background

    # Save as WebP with high quality
    output_buffer = io.BytesIO()
    cropped.save(
        output_buffer,
        format='WEBP',
        quality=85,
        method=6  # Best compression (slowest but smallest file)
    )
    output_buffer.seek(0)

    # Construct thumbnail S3 key
    # Format: users/{userId}/{entityType}/{entityId}/{subdir}/{filename}.webp
    thumbnail_key = f"{base_path}/{subdir_name}/{filename_without_ext}.webp"

    # Upload to S3
    try:
        s3_client.put_object(
            Bucket=bucket,
            Key=thumbnail_key,
            Body=output_buffer.getvalue(),
            ContentType='image/webp',
            CacheControl='max-age=31536000',  # 1 year cache (thumbnails are immutable)
        )
        logger.info(f"Uploaded thumbnail: {thumbnail_key} ({target_width}x{target_height})")
    except ClientError as e:
        logger.error(f"Failed to upload thumbnail {thumbnail_key}: {str(e)}")
        raise

    return thumbnail_key


def generate_thumbnails_for_key(bucket: str, key: str) -> Optional[Dict]:
    """
    Helper function to generate thumbnails for a specific S3 key.
    Can be called directly for backfill operations.

    Args:
        bucket: S3 bucket name
        key: S3 object key

    Returns:
        Dict with processing results or None if skipped

    Raises:
        Exception: If processing fails
    """
    # Create a mock S3 event record
    mock_record = {
        's3': {
            'bucket': {'name': bucket},
            'object': {'key': key}
        }
    }
    return process_s3_record(mock_record)
