"""
API Stack: Lambda functions and API Gateway for image upload/download
Provides secure API endpoints with user authorization
Supports CloudFront signed cookies for authenticated image access
"""
from aws_cdk import (
    Stack,
    Duration,
    CfnOutput,
    aws_lambda as lambda_,
    aws_apigateway as apigw,
    aws_iam as iam,
    aws_logs as logs,
    aws_secretsmanager as secretsmanager,
)
from constructs import Construct
from cdk_nag import NagSuppressions


class ImageApiStack(Stack):
    """
    Creates Lambda functions and API Gateway for secure image operations
    with pre-signed URL generation
    """

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
        storage_stack,
        **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.env_name = env_name
        self.storage_stack = storage_stack

        # Create Lambda execution role with minimal permissions
        lambda_role = iam.Role(
            self,
            "ImageLambdaRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            description="Execution role for image upload/download Lambda functions",
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaBasicExecutionRole"
                ),
            ],
        )

        # Grant S3 permissions to Lambda role
        storage_stack.image_bucket.grant_read_write(lambda_role)
        storage_stack.image_bucket.grant_put(lambda_role)

        # Lambda function for generating pre-signed upload URLs
        self.upload_url_function = lambda_.Function(
            self,
            "PresignedUploadFunction",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="presigned_upload.lambda_handler",
            code=lambda_.Code.from_asset("lambda_functions"),
            role=lambda_role,
            timeout=Duration.seconds(30),
            memory_size=256,
            environment={
                "BUCKET_NAME": storage_stack.image_bucket.bucket_name,
                "URL_EXPIRATION": "900",  # 15 minutes
            },
            description="Generate pre-signed S3 upload URLs with user authorization",
            log_retention=logs.RetentionDays.ONE_WEEK,
        )

        # Get CloudFront configuration from context
        cloudfront_key_pair_id = self.node.try_get_context("cloudfront_public_key_id")
        if not cloudfront_key_pair_id:
            raise ValueError(
                "CloudFront public key ID is required for signed cookies. "
                "Set it in cdk.json or pass via context: -c cloudfront_public_key_id=K3..."
            )

        # Get reference to the CloudFront private key secret
        private_key_secret = secretsmanager.Secret.from_secret_name_v2(
            self,
            "CloudFrontPrivateKeySecret",
            secret_name=f"/fancy-planties/cloudfront/private-key-{env_name}"
        )

        # Grant Lambda role permission to read the secret
        private_key_secret.grant_read(lambda_role)

        # Lambda function for generating CloudFront signed cookies
        self.cookie_generator_function = lambda_.Function(
            self,
            "SignedCookieFunction",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="signed_cookie_generator.lambda_handler",
            code=lambda_.Code.from_asset("lambda_functions"),
            role=lambda_role,
            timeout=Duration.seconds(30),
            memory_size=256,
            environment={
                "PRIVATE_KEY_SECRET_NAME": private_key_secret.secret_name,
                "CLOUDFRONT_KEY_PAIR_ID": cloudfront_key_pair_id,
                "CLOUDFRONT_DOMAIN": storage_stack.distribution.distribution_domain_name,
                "COOKIE_EXPIRATION_DAYS": "7",
            },
            description="Generate CloudFront signed cookies for authenticated image access",
            log_retention=logs.RetentionDays.ONE_WEEK,
        )

        # DEPRECATED: Lambda function for generating pre-signed download URLs
        # Kept temporarily for backward compatibility - will be removed after migration
        # self.download_url_function = lambda_.Function(
        #     self,
        #     "PresignedDownloadFunction",
        #     runtime=lambda_.Runtime.PYTHON_3_12,
        #     handler="presigned_download.lambda_handler",
        #     code=lambda_.Code.from_asset("lambda_functions"),
        #     role=lambda_role,
        #     timeout=Duration.seconds(30),
        #     memory_size=256,
        #     environment={
        #         "BUCKET_NAME": storage_stack.image_bucket.bucket_name,
        #         "CLOUDFRONT_DOMAIN": storage_stack.distribution.distribution_domain_name,
        #         "URL_EXPIRATION": "900",  # 15 minutes
        #     },
        #     description="Generate pre-signed S3 download URLs with user authorization",
        #     log_retention=logs.RetentionDays.ONE_WEEK,
        # )

        # Create API Gateway REST API
        self.api = apigw.RestApi(
            self,
            "ImageApi",
            rest_api_name=f"fancy-planties-image-api-{env_name}",
            description="API for secure image upload and download operations",
            deploy_options=apigw.StageOptions(
                stage_name=env_name,
                throttling_rate_limit=100,
                throttling_burst_limit=200,
                logging_level=apigw.MethodLoggingLevel.INFO,
                data_trace_enabled=True,
                metrics_enabled=True,
            ),
            # Enable CORS
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,  # TODO: Restrict in production
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=[
                    "Content-Type",
                    "X-Amz-Date",
                    "Authorization",
                    "X-Api-Key",
                    "X-Amz-Security-Token",
                ],
            ),
        )

        # Create /images resource
        images = self.api.root.add_resource("images")

        # Create /images/upload endpoint
        upload = images.add_resource("upload")
        upload.add_method(
            "POST",
            apigw.LambdaIntegration(
                self.upload_url_function,
                proxy=True,
            ),
        )

        # Create /images/auth-cookie endpoint for CloudFront signed cookies
        auth_cookie = images.add_resource("auth-cookie")
        auth_cookie.add_method(
            "POST",
            apigw.LambdaIntegration(
                self.cookie_generator_function,
                proxy=True,
            ),
        )

        # DEPRECATED: /images/download endpoint
        # Commented out after migration to CloudFront signed cookies
        # download = images.add_resource("download")
        # download.add_method(
        #     "POST",
        #     apigw.LambdaIntegration(
        #         self.download_url_function,
        #         proxy=True,
        #     ),
        # )

        # CDK Nag suppressions
        NagSuppressions.add_resource_suppressions(
            self.api,
            [
                {
                    "id": "AwsSolutions-APIG2",
                    "reason": "Request validation will be implemented at application level. "
                             "Lambda functions perform input validation."
                },
                {
                    "id": "AwsSolutions-APIG4",
                    "reason": "Authorization is implemented at the application level. "
                             "Next.js API routes validate user sessions before calling these endpoints."
                },
                {
                    "id": "AwsSolutions-COG4",
                    "reason": "Cognito authorizer not used. Application uses Lucia Auth for session management. "
                             "User authorization is validated in Next.js API routes."
                },
            ],
            apply_to_children=True,
        )

        NagSuppressions.add_resource_suppressions(
            lambda_role,
            [
                {
                    "id": "AwsSolutions-IAM4",
                    "reason": "AWSLambdaBasicExecutionRole is the standard managed policy for Lambda execution. "
                             "Additional permissions are granted via specific resource policies."
                },
            ],
        )

        # Outputs
        CfnOutput(
            self,
            "ApiEndpoint",
            value=self.api.url,
            description="API Gateway endpoint URL",
            export_name=f"FancyPlantiesApiEndpoint-{env_name}",
        )

        CfnOutput(
            self,
            "UploadFunctionName",
            value=self.upload_url_function.function_name,
            description="Upload URL generator Lambda function name",
            export_name=f"FancyPlantiesUploadFunction-{env_name}",
        )

        CfnOutput(
            self,
            "CookieGeneratorFunctionName",
            value=self.cookie_generator_function.function_name,
            description="CloudFront signed cookie generator Lambda function name",
            export_name=f"FancyPlantiesCookieFunction-{env_name}",
        )

        # DEPRECATED: Download function output - removed after migration
        # CfnOutput(
        #     self,
        #     "DownloadFunctionName",
        #     value=self.download_url_function.function_name,
        #     description="Download URL generator Lambda function name",
        #     export_name=f"FancyPlantiesDownloadFunction-{env_name}",
        # )
