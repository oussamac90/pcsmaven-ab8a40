# AWS Provider configuration for KMS resources
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Main KMS key for Port Community System encryption
resource "aws_kms_key" "main" {
  description              = "KMS key for Port Community System encryption - Manages critical and confidential data"
  deletion_window_in_days  = var.key_deletion_window
  enable_key_rotation     = var.enable_key_rotation
  is_enabled              = true
  multi_region            = true
  customer_master_key_spec = "SYMMETRIC_DEFAULT"
  key_usage               = "ENCRYPT_DECRYPT"

  # Policy document for key access and management
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Key Rotation and Backup"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = [
          "kms:CreateGrant",
          "kms:ListGrants",
          "kms:RevokeGrant",
          "kms:EnableKeyRotation",
          "kms:GetKeyRotationStatus"
        ]
        Resource = "*"
      }
    ]
  })

  # Comprehensive tagging for security and compliance
  tags = merge(var.tags, {
    Environment      = var.environment
    Project         = var.project
    ManagedBy       = "terraform"
    SecurityLevel   = "Critical"
    ComplianceScope = "PCI-DSS"
    AutoRotation    = "Enabled"
    DataEncryption  = "AES-256"
    MultiRegion     = "true"
    BackupEnabled   = "true"
    LastRotation    = formatdate("YYYY-MM-DD", timestamp())
  })
}

# Alias for the KMS key for easier reference
resource "aws_kms_alias" "main" {
  name          = "alias/${var.project}-${var.environment}-key"
  target_key_id = aws_kms_key.main.key_id
}

# Replica key for disaster recovery in secondary region
resource "aws_kms_replica_key" "replica" {
  provider = aws.secondary_region

  description             = "Multi-region replica key for ${var.project}-${var.environment}"
  deletion_window_in_days = var.key_deletion_window
  primary_key_arn        = aws_kms_key.main.arn

  tags = merge(var.tags, {
    Environment     = var.environment
    Project        = var.project
    ManagedBy      = "terraform"
    SecurityLevel  = "Critical"
    ReplicaType    = "DR"
    PrimaryKeyARN  = aws_kms_key.main.arn
    ReplicationDate = formatdate("YYYY-MM-DD", timestamp())
  })
}

# Alias for the replica key
resource "aws_kms_alias" "replica" {
  provider = aws.secondary_region
  
  name          = "alias/${var.project}-${var.environment}-replica-key"
  target_key_id = aws_kms_replica_key.replica.key_id
}

# Data source for current AWS account ID
data "aws_caller_identity" "current" {}

# Outputs for key references
output "key_id" {
  description = "The ID of the KMS key"
  value       = aws_kms_key.main.key_id
}

output "key_arn" {
  description = "The ARN of the KMS key"
  value       = aws_kms_key.main.arn
}

output "alias_name" {
  description = "The name of the KMS key alias"
  value       = aws_kms_alias.main.name
}

output "alias_arn" {
  description = "The ARN of the KMS key alias"
  value       = aws_kms_alias.main.arn
}

output "replica_key_id" {
  description = "The ID of the replica KMS key"
  value       = aws_kms_replica_key.replica.key_id
}

output "replica_key_arn" {
  description = "The ARN of the replica KMS key"
  value       = aws_kms_replica_key.replica.arn
}