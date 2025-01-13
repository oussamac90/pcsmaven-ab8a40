# Output configuration for S3 buckets in Port Community System
# Version: 1.0.0

# Document Storage Bucket Outputs
output "document_bucket_id" {
  description = "ID of the S3 bucket for document storage"
  value       = aws_s3_bucket.document_storage.id
}

output "document_bucket_arn" {
  description = "ARN of the S3 bucket for document storage"
  value       = aws_s3_bucket.document_storage.arn
}

output "document_bucket_name" {
  description = "Name of the S3 bucket for document storage"
  value       = aws_s3_bucket.document_storage.bucket
}

# EDIFACT Message Storage Bucket Outputs
output "edifact_bucket_id" {
  description = "ID of the S3 bucket for EDIFACT message storage"
  value       = aws_s3_bucket.edifact_messages.id
}

output "edifact_bucket_arn" {
  description = "ARN of the S3 bucket for EDIFACT message storage"
  value       = aws_s3_bucket.edifact_messages.arn
}

output "edifact_bucket_name" {
  description = "Name of the S3 bucket for EDIFACT message storage"
  value       = aws_s3_bucket.edifact_messages.bucket
}