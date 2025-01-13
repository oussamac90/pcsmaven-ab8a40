# AWS CloudFront Configuration for Port Community System
# Version: 1.0.0
# Provider: hashicorp/aws ~> 4.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
  required_version = "~> 1.0"
}

# Provider configuration for CloudFront (must be in us-east-1)
provider "aws" {
  region = "us-east-1" # Required for CloudFront and ACM global services
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "Origin Access Identity for Port Community System - ${var.environment}"
}

# ACM Certificate for CloudFront Distribution
resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  tags = merge(
    var.tags,
    {
      Name        = "pcs-cloudfront-cert-${var.environment}"
      Environment = var.environment
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled    = true
  comment            = "Port Community System CDN - ${var.environment}"
  price_class        = var.price_class
  aliases            = [var.domain_name, "*.${var.domain_name}"]
  default_root_object = "index.html"

  # Origin configuration for S3
  origin {
    domain_name = "${data.aws_s3_bucket.document_bucket_id}.s3.amazonaws.com"
    origin_id   = "S3-${data.aws_s3_bucket.document_bucket_id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }

    custom_header {
      name  = "X-Origin-Verify"
      value = sha256("${var.environment}-${data.aws_s3_bucket.document_bucket_id}")
    }
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${data.aws_s3_bucket.document_bucket_id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = var.min_ttl
    default_ttl            = var.default_ttl
    max_ttl                = var.max_ttl
    compress               = var.enable_compression
  }

  # Specific cache behavior for documents
  ordered_cache_behavior {
    path_pattern     = "/documents/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${data.aws_s3_bucket.document_bucket_id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 3600    # 1 hour
    default_ttl            = 86400   # 24 hours
    max_ttl                = 604800  # 1 week
    compress               = true
  }

  # SSL/TLS Configuration
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = var.ssl_protocol_version
  }

  # Geo Restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Custom Error Responses
  custom_error_response {
    error_code         = 403
    response_code      = 404
    response_page_path = "/404.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
  }

  # Logging Configuration
  logging_config {
    include_cookies = false
    bucket         = "${data.aws_s3_bucket.document_bucket_id}.s3.amazonaws.com"
    prefix         = "cloudfront-logs/"
  }

  tags = merge(
    var.tags,
    {
      Name         = "pcs-cloudfront-${var.environment}"
      Environment  = var.environment
      Service      = "CDN"
      ManagedBy    = "Terraform"
    }
  )
}

# Outputs
output "cloudfront_distribution_id" {
  description = "The identifier for the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_distribution_domain" {
  description = "The domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_arn" {
  description = "The ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.arn
}

output "acm_certificate_arn" {
  description = "The ARN of the ACM certificate used by CloudFront"
  value       = aws_acm_certificate.main.arn
}