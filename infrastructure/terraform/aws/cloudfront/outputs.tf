# AWS CloudFront Distribution Outputs
# Version: 1.0.0
# Provider: hashicorp/terraform ~> 1.0

# The unique identifier of the CloudFront distribution
# Used for API operations and resource references
output "cloudfront_distribution_id" {
  description = "The unique identifier of the CloudFront distribution for API operations and resource references"
  value       = aws_cloudfront_distribution.main.id
}

# The domain name assigned to the CloudFront distribution
# Used for DNS configuration and content delivery routing
output "cloudfront_domain_name" {
  description = "The assigned domain name of the CloudFront distribution for DNS configuration and routing"
  value       = aws_cloudfront_distribution.main.domain_name
}

# The Amazon Resource Name (ARN) of the CloudFront distribution
# Used for IAM policies and resource permissions
output "cloudfront_distribution_arn" {
  description = "The Amazon Resource Name (ARN) of the CloudFront distribution for IAM policies and permissions"
  value       = aws_cloudfront_distribution.main.arn
}