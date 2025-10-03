#!/usr/bin/env python3
"""
Fancy Planties CDK Infrastructure
Deploys S3 + CloudFront for image storage with secure pre-signed URLs
"""
import os
from aws_cdk import App, Environment
from stacks.storage_stack import ImageStorageStack
from stacks.api_stack import ImageApiStack

app = App()

# Get environment from context or environment variables
env_name = app.node.try_get_context("environment") or os.environ.get("CDK_ENVIRONMENT", "dev")

# Define AWS environment (region and account)
env = Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION", "us-east-1")
)

# Create storage stack (S3 + CloudFront)
storage_stack = ImageStorageStack(
    app,
    f"FancyPlantiesStorage-{env_name}",
    env=env,
    env_name=env_name,
    description="S3 bucket and CloudFront distribution for Fancy Planties image storage"
)

# Create API stack (Lambda functions for pre-signed URLs)
api_stack = ImageApiStack(
    app,
    f"FancyPlantiesImageApi-{env_name}",
    env=env,
    env_name=env_name,
    storage_stack=storage_stack,
    description="Lambda functions and API Gateway for secure image upload/download"
)

# Add dependency to ensure storage is created first
api_stack.add_dependency(storage_stack)

app.synth()
