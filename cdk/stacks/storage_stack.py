"""
Storage Stack: S3 Bucket + CloudFront Distribution for Image Storage
Implements cost-effective, secure image storage with CDN delivery
"""
from aws_cdk import (
    Stack,
    RemovalPolicy,
    Duration,
    CfnOutput,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_iam as iam,
)
from constructs import Construct
from cdk_nag import NagSuppressions


class ImageStorageStack(Stack):
    """
    Creates S3 bucket with Intelligent-Tiering and CloudFront distribution
    with Origin Access Control for secure, cost-effective image storage.
    """

    def __init__(self, scope: Construct, construct_id: str, env_name: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.env_name = env_name

        # Create S3 bucket for image storage
        self.image_bucket = s3.Bucket(
            self,
            "ImageBucket",
            bucket_name=f"fancy-planties-images-{env_name}-{self.account}",
            # Security settings
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            versioned=True,  # Enable versioning for data protection

            # Cost optimization with Intelligent-Tiering
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="IntelligentTieringRule",
                    enabled=True,
                    transitions=[
                        s3.Transition(
                            storage_class=s3.StorageClass.INTELLIGENT_TIERING,
                            transition_after=Duration.days(0)  # Immediate transition
                        )
                    ],
                ),
                # Archive old versions after 90 days
                s3.LifecycleRule(
                    id="ArchiveOldVersions",
                    enabled=True,
                    noncurrent_version_transitions=[
                        s3.NoncurrentVersionTransition(
                            storage_class=s3.StorageClass.GLACIER,
                            transition_after=Duration.days(90)
                        )
                    ],
                    noncurrent_version_expiration=Duration.days(365)  # Delete after 1 year
                ),
            ],

            # CORS configuration for browser uploads
            cors=[
                s3.CorsRule(
                    allowed_methods=[
                        s3.HttpMethods.GET,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.DELETE,
                    ],
                    allowed_origins=["*"],  # TODO: Restrict to your domain in production
                    allowed_headers=["*"],
                    exposed_headers=["ETag"],
                    max_age=3000,
                )
            ],

            # Removal policy - be careful in production
            removal_policy=RemovalPolicy.RETAIN if env_name == "prod" else RemovalPolicy.DESTROY,
            auto_delete_objects=False if env_name == "prod" else True,
        )

        # Create CloudFront Origin Access Control (OAC)
        cfn_origin_access_control = cloudfront.CfnOriginAccessControl(
            self,
            "ImageBucketOAC",
            origin_access_control_config=cloudfront.CfnOriginAccessControl.OriginAccessControlConfigProperty(
                name=f"fancy-planties-oac-{env_name}",
                origin_access_control_origin_type="s3",
                signing_behavior="always",
                signing_protocol="sigv4",
                description="Origin Access Control for Fancy Planties image bucket"
            )
        )

        # Create CloudFront distribution
        self.distribution = cloudfront.Distribution(
            self,
            "ImageDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(
                    self.image_bucket,
                    # OAC will be added via L1 construct below
                ),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowed_methods=cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cached_methods=cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                compress=True,
            ),
            # Price class for cost optimization (use lower-cost edge locations)
            price_class=cloudfront.PriceClass.PRICE_CLASS_100,  # US, Canada, Europe

            # Enable HTTP/2 and HTTP/3
            http_version=cloudfront.HttpVersion.HTTP2_AND_3,

            # Enable IPv6
            enable_ipv6=True,

            # Error responses
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=404,
                    response_page_path="/404.html",
                    ttl=Duration.minutes(5),
                ),
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=404,
                    response_page_path="/404.html",
                    ttl=Duration.minutes(5),
                ),
            ],

            comment=f"Fancy Planties Image CDN ({env_name})",
        )

        # Attach OAC to CloudFront distribution (L1 construct)
        cfn_distribution = self.distribution.node.default_child
        cfn_distribution.add_property_override(
            "DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity", ""
        )
        cfn_distribution.add_property_override(
            "DistributionConfig.Origins.0.OriginAccessControlId",
            cfn_origin_access_control.get_att("Id")
        )

        # Grant CloudFront OAC access to S3 bucket
        self.image_bucket.add_to_resource_policy(
            iam.PolicyStatement(
                sid="AllowCloudFrontServicePrincipal",
                effect=iam.Effect.ALLOW,
                principals=[iam.ServicePrincipal("cloudfront.amazonaws.com")],
                actions=["s3:GetObject"],
                resources=[f"{self.image_bucket.bucket_arn}/*"],
                conditions={
                    "StringEquals": {
                        "AWS:SourceArn": f"arn:aws:cloudfront::{self.account}:distribution/{self.distribution.distribution_id}"
                    }
                },
            )
        )

        # CDK Nag suppressions for intentional design choices
        NagSuppressions.add_resource_suppressions(
            self.image_bucket,
            [
                {
                    "id": "AwsSolutions-S1",
                    "reason": "Access logs not required for image storage bucket in this use case. "
                             "CloudFront logs can be enabled if needed for analytics."
                },
            ],
        )

        # Outputs
        CfnOutput(
            self,
            "ImageBucketName",
            value=self.image_bucket.bucket_name,
            description="S3 bucket name for image storage",
            export_name=f"FancyPlantiesImageBucket-{env_name}",
        )

        CfnOutput(
            self,
            "ImageBucketArn",
            value=self.image_bucket.bucket_arn,
            description="S3 bucket ARN for image storage",
            export_name=f"FancyPlantiesImageBucketArn-{env_name}",
        )

        CfnOutput(
            self,
            "CloudFrontDomainName",
            value=self.distribution.distribution_domain_name,
            description="CloudFront distribution domain name",
            export_name=f"FancyPlantiesCloudFrontDomain-{env_name}",
        )

        CfnOutput(
            self,
            "CloudFrontDistributionId",
            value=self.distribution.distribution_id,
            description="CloudFront distribution ID",
            export_name=f"FancyPlantiesCloudFrontId-{env_name}",
        )
