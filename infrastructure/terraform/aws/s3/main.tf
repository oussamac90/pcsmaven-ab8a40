# AWS S3 configuration for Port Community System
# Version: 1.0.0
# Provider version: hashicorp/aws ~> 4.0

# Document Storage Bucket
resource "aws_s3_bucket" "document_storage" {
  bucket        = "${var.project_name}-${var.environment}-documents"
  force_destroy = var.force_destroy

  tags = merge(
    {
      Name           = "${var.project_name}-${var.environment}-documents"
      Environment    = var.environment
      Classification = "Confidential"
      Purpose       = "Port Document Storage"
      ManagedBy     = "Terraform"
    },
    var.tags
  )
}

# Document Bucket Versioning
resource "aws_s3_bucket_versioning" "document_versioning" {
  bucket = aws_s3_bucket.document_storage.id
  versioning_configuration {
    status     = var.enable_versioning ? "Enabled" : "Disabled"
    mfa_delete = true
  }
}

# Document Bucket Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "document_encryption" {
  bucket = aws_s3_bucket.document_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

# Document Bucket Lifecycle Rules
resource "aws_s3_bucket_lifecycle_configuration" "document_lifecycle" {
  bucket = aws_s3_bucket.document_storage.id

  rule {
    id     = "document_retention"
    status = "Enabled"

    transition {
      days          = var.document_retention_days
      storage_class = "STANDARD_IA"
    }

    noncurrent_version_expiration {
      noncurrent_days = var.document_expiration_days
    }
  }
}

# Document Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "document_access" {
  bucket = aws_s3_bucket.document_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# EDIFACT Message Storage Bucket
resource "aws_s3_bucket" "edifact_messages" {
  bucket        = "${var.project_name}-${var.environment}-edifact"
  force_destroy = var.force_destroy

  tags = merge(
    {
      Name           = "${var.project_name}-${var.environment}-edifact"
      Environment    = var.environment
      Classification = "Confidential"
      Purpose       = "EDIFACT Message Storage"
      MessageTypes  = "IFTSTA,IFTMBC,COARRI"
      ManagedBy     = "Terraform"
    },
    var.tags
  )
}

# EDIFACT Bucket Versioning
resource "aws_s3_bucket_versioning" "edifact_versioning" {
  bucket = aws_s3_bucket.edifact_messages.id
  versioning_configuration {
    status     = var.enable_versioning ? "Enabled" : "Disabled"
    mfa_delete = true
  }
}

# EDIFACT Bucket Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "edifact_encryption" {
  bucket = aws_s3_bucket.edifact_messages.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

# EDIFACT Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "edifact_access" {
  bucket = aws_s3_bucket.edifact_messages.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS Configuration for Document Bucket
resource "aws_s3_bucket_cors_configuration" "document_cors" {
  bucket = aws_s3_bucket.document_storage.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["https://*.${var.project_name}.com"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Bucket Logging Configuration
resource "aws_s3_bucket_logging" "document_logging" {
  bucket = aws_s3_bucket.document_storage.id

  target_bucket = aws_s3_bucket.document_storage.id
  target_prefix = "log/"
}

# Output values for other modules
output "document_bucket_id" {
  description = "ID of the document storage bucket"
  value       = aws_s3_bucket.document_storage.id
}

output "document_bucket_arn" {
  description = "ARN of the document storage bucket"
  value       = aws_s3_bucket.document_storage.arn
}

output "edifact_bucket_id" {
  description = "ID of the EDIFACT message storage bucket"
  value       = aws_s3_bucket.edifact_messages.id
}

output "edifact_bucket_arn" {
  description = "ARN of the EDIFACT message storage bucket"
  value       = aws_s3_bucket.edifact_messages.arn
}