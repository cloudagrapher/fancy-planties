"""
Backfill script to generate thumbnails for existing images in S3.
Can be run as a Lambda function or as a local script with AWS credentials.

Usage:
    As Lambda: Invoke with payload {"dryRun": true} to test
    Locally: python backfill_thumbnails.py [--bucket BUCKET_NAME] [--dry-run] [--batch-size 10] [--function-name LAMBDA_FUNCTION_NAME]
"""
import json
import os
import sys
import time
import logging
import argparse
from typing import List, Dict, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

import boto3
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
s3_client = boto3.client('s3')

# Configuration
DEFAULT_BATCH_SIZE = 10
DEFAULT_DELAY_SECONDS = 0.5
SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
THUMBNAIL_MARKER = '/thumb-'


def lambda_handler(event: Dict, context: Dict) -> Dict:
    """
    Lambda handler for backfill operation.

    Args:
        event: Lambda event with optional parameters:
            - dryRun (bool): If true, only list images without processing
            - batchSize (int): Number of images to process per batch
            - maxImages (int): Maximum number of images to process
        context: Lambda context object

    Returns:
        Response dict with processing statistics
    """
    bucket = os.environ.get('BUCKET_NAME')
    if not bucket:
        logger.error("BUCKET_NAME environment variable not set")
        return {
            'statusCode': 400,
            'body': {'error': 'BUCKET_NAME not configured'}
        }

    dry_run = event.get('dryRun', False)
    batch_size = event.get('batchSize', DEFAULT_BATCH_SIZE)
    max_images = event.get('maxImages', None)

    logger.info(f"Starting backfill: bucket={bucket}, dry_run={dry_run}, "
                f"batch_size={batch_size}, max_images={max_images}")

    try:
        stats = backfill_thumbnails(
            bucket=bucket,
            dry_run=dry_run,
            batch_size=batch_size,
            max_images=max_images
        )

        return {
            'statusCode': 200,
            'body': stats
        }

    except Exception as e:
        logger.error(f"Backfill failed: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': {'error': str(e)}
        }


def backfill_thumbnails(
    bucket: str,
    dry_run: bool = False,
    batch_size: int = DEFAULT_BATCH_SIZE,
    max_images: Optional[int] = None
) -> Dict:
    """
    Main backfill logic to process existing images.

    Args:
        bucket: S3 bucket name
        dry_run: If True, only list images without processing
        batch_size: Number of images to process concurrently
        max_images: Maximum number of images to process (None for all)

    Returns:
        Dict with processing statistics
    """
    # Find all images that need thumbnail generation
    logger.info("Scanning S3 bucket for images...")
    images_to_process = find_images_needing_thumbnails(bucket, max_images)

    total_images = len(images_to_process)
    logger.info(f"Found {total_images} images needing thumbnails")

    if dry_run:
        logger.info("Dry run mode - listing images only")
        for i, key in enumerate(images_to_process[:20], 1):  # Show first 20
            logger.info(f"  {i}. {key}")
        if total_images > 20:
            logger.info(f"  ... and {total_images - 20} more")
        return {
            'dryRun': True,
            'totalImages': total_images,
            'sampleImages': images_to_process[:20]
        }

    # Process images in batches
    logger.info(f"Processing {total_images} images in batches of {batch_size}...")
    stats = process_images_in_batches(bucket, images_to_process, batch_size)

    logger.info(f"Backfill complete: {stats}")
    return stats


def find_images_needing_thumbnails(
    bucket: str,
    max_images: Optional[int] = None
) -> List[str]:
    """
    List all original images that don't have thumbnails yet.

    Args:
        bucket: S3 bucket name
        max_images: Maximum number of images to return

    Returns:
        List of S3 keys that need thumbnail generation
    """
    images_needing_thumbnails = []
    continuation_token = None

    try:
        while True:
            # List objects with pagination
            list_params = {
                'Bucket': bucket,
                'Prefix': 'users/',  # Only scan user images
            }
            if continuation_token:
                list_params['ContinuationToken'] = continuation_token

            response = s3_client.list_objects_v2(**list_params)

            # Check each object
            for obj in response.get('Contents', []):
                key = obj['Key']

                # Skip if this is already a thumbnail
                if THUMBNAIL_MARKER in key:
                    continue

                # Skip if not a supported image format
                ext = os.path.splitext(key)[1].lower()
                if ext not in SUPPORTED_EXTENSIONS:
                    continue

                # Check if this image already has thumbnails
                if not has_thumbnails(bucket, key):
                    images_needing_thumbnails.append(key)
                    logger.debug(f"Needs thumbnails: {key}")

                    # Stop if we've reached the max
                    if max_images and len(images_needing_thumbnails) >= max_images:
                        logger.info(f"Reached max_images limit: {max_images}")
                        return images_needing_thumbnails

            # Check if there are more results
            if not response.get('IsTruncated'):
                break

            continuation_token = response.get('NextContinuationToken')

    except ClientError as e:
        logger.error(f"Failed to list objects: {str(e)}")
        raise

    return images_needing_thumbnails


def has_thumbnails(bucket: str, original_key: str) -> bool:
    """
    Check if thumbnails already exist for the given image.

    Args:
        bucket: S3 bucket name
        original_key: Original image S3 key

    Returns:
        True if at least one thumbnail exists
    """
    # Construct expected thumbnail key (check thumb-64 as indicator)
    # Format: users/{userId}/{entityType}/{entityId}/{uuid}.{ext}
    # Thumbnail: users/{userId}/{entityType}/{entityId}/thumb-64/{uuid}.webp

    key_parts = original_key.rsplit('/', 1)
    if len(key_parts) != 2:
        return False

    base_path = key_parts[0]
    filename = key_parts[1]
    filename_without_ext = os.path.splitext(filename)[0]

    # Check if thumb-64 exists (as indicator that thumbnails were generated)
    thumbnail_key = f"{base_path}/thumb-64/{filename_without_ext}.webp"

    try:
        s3_client.head_object(Bucket=bucket, Key=thumbnail_key)
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            return False
        # Other errors (permissions, etc.) - log and assume no thumbnails
        logger.warning(f"Error checking thumbnail {thumbnail_key}: {str(e)}")
        return False


def process_images_in_batches(
    bucket: str,
    image_keys: List[str],
    batch_size: int
) -> Dict:
    """
    Process images in batches with throttling.

    Args:
        bucket: S3 bucket name
        image_keys: List of image S3 keys to process
        batch_size: Number of images to process concurrently

    Returns:
        Dict with processing statistics
    """
    total = len(image_keys)
    successful = 0
    failed = 0
    skipped = 0

    # Import the thumbnail generation function
    try:
        from generate_thumbnails import generate_thumbnails_for_key
    except ImportError:
        logger.warning("Failed to import generate_thumbnails module (Pillow not available)")
        logger.warning("Falling back to Lambda invocation mode")
        # Validate Lambda function name is configured
        if not os.environ.get('THUMBNAIL_FUNCTION_NAME'):
            logger.error(
                "Cannot proceed: Pillow not installed locally AND THUMBNAIL_FUNCTION_NAME not set. "
                "Either install Pillow or pass --function-name argument."
            )
            raise RuntimeError(
                "Missing required dependency: Either install Pillow for local processing "
                "or provide Lambda function name via --function-name argument"
            )
        # Define a fallback that calls Lambda directly
        generate_thumbnails_for_key = lambda b, k: invoke_thumbnail_lambda(b, k)

    # Process in batches
    for i in range(0, total, batch_size):
        batch = image_keys[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (total + batch_size - 1) // batch_size

        logger.info(f"Processing batch {batch_num}/{total_batches} "
                   f"({len(batch)} images)...")

        # Process batch concurrently
        with ThreadPoolExecutor(max_workers=batch_size) as executor:
            future_to_key = {
                executor.submit(
                    process_single_image,
                    bucket,
                    key,
                    generate_thumbnails_for_key
                ): key
                for key in batch
            }

            for future in as_completed(future_to_key):
                key = future_to_key[future]
                try:
                    result = future.result()
                    if result.get('success'):
                        if result.get('skipped'):
                            skipped += 1
                        else:
                            successful += 1
                    else:
                        failed += 1
                        logger.error(f"Failed: {key} - {result.get('error')}")
                except Exception as e:
                    failed += 1
                    logger.error(f"Exception processing {key}: {str(e)}")

        # Throttle between batches to avoid rate limits
        if i + batch_size < total:
            time.sleep(DEFAULT_DELAY_SECONDS)
            logger.info(f"Progress: {successful} successful, {skipped} skipped, "
                       f"{failed} failed out of {i + len(batch)} processed")

    stats = {
        'total': total,
        'successful': successful,
        'skipped': skipped,
        'failed': failed
    }

    return stats


def process_single_image(
    bucket: str,
    key: str,
    generator_func
) -> Dict:
    """
    Process a single image to generate thumbnails.

    Args:
        bucket: S3 bucket name
        key: Image S3 key
        generator_func: Function to generate thumbnails

    Returns:
        Dict with processing result
    """
    try:
        logger.info(f"Processing: {key}")
        result = generator_func(bucket, key)
        return result
    except Exception as e:
        logger.error(f"Failed to process {key}: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'key': key
        }


def invoke_thumbnail_lambda(bucket: str, key: str) -> Dict:
    """
    Fallback: invoke the thumbnail Lambda function directly.

    Args:
        bucket: S3 bucket name
        key: Image S3 key

    Returns:
        Dict with processing result
    """
    lambda_client = boto3.client('lambda')
    function_name = os.environ.get('THUMBNAIL_FUNCTION_NAME')

    if not function_name:
        raise ValueError("THUMBNAIL_FUNCTION_NAME environment variable not set")

    # Create mock S3 event
    event = {
        'Records': [{
            's3': {
                'bucket': {'name': bucket},
                'object': {'key': key}
            }
        }]
    }

    try:
        response = lambda_client.invoke(
            FunctionName=function_name,
            InvocationType='RequestResponse',
            Payload=json.dumps(event).encode()
        )
        return {
            'success': response['StatusCode'] == 200,
            'response': response
        }
    except ClientError as e:
        logger.error(f"Failed to invoke Lambda: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


def main() -> None:
    """
    CLI entry point for local execution.
    """
    parser = argparse.ArgumentParser(
        description='Backfill thumbnails for existing S3 images'
    )
    parser.add_argument(
        '--bucket',
        required=False,
        help='S3 bucket name (or set BUCKET_NAME env var)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='List images only, do not process'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f'Number of images to process concurrently (default: {DEFAULT_BATCH_SIZE})'
    )
    parser.add_argument(
        '--max-images',
        type=int,
        default=None,
        help='Maximum number of images to process'
    )
    parser.add_argument(
        '--function-name',
        required=False,
        help='Lambda function name for thumbnail generation (or set THUMBNAIL_FUNCTION_NAME env var)'
    )

    args = parser.parse_args()

    # Get bucket name from arg or environment
    bucket = args.bucket or os.environ.get('BUCKET_NAME')
    if not bucket:
        print("Error: Bucket name required via --bucket or BUCKET_NAME env var")
        sys.exit(1)

    # Set function name if provided (for Lambda invocation fallback)
    if args.function_name:
        os.environ['THUMBNAIL_FUNCTION_NAME'] = args.function_name

    # Configure logging for console
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

    try:
        stats = backfill_thumbnails(
            bucket=bucket,
            dry_run=args.dry_run,
            batch_size=args.batch_size,
            max_images=args.max_images
        )

        print("\n" + "=" * 60)
        print("BACKFILL COMPLETE")
        print("=" * 60)
        print(f"Total images:    {stats.get('total', 0)}")
        print(f"Successful:      {stats.get('successful', 0)}")
        print(f"Skipped:         {stats.get('skipped', 0)}")
        print(f"Failed:          {stats.get('failed', 0)}")
        print("=" * 60)

    except Exception as e:
        logger.error(f"Backfill failed: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
