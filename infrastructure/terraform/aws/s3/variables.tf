# Project name variable for resource naming
variable "project_name" {
  description = "Name of the project used for resource naming"
  type        = string
  default     = "pcs"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens"
  }
}

# Environment variable for deployment context
variable "environment" {
  description = "Deployment environment (dev, staging, prod, dr)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod", "dr"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod, dr"
  }
}

# Document retention configuration
variable "document_retention_days" {
  description = "Number of days before transitioning documents to STANDARD_IA storage class"
  type        = number
  default     = 30

  validation {
    condition     = var.document_retention_days >= 30
    error_message = "Document retention days must be at least 30 days"
  }
}

# Document expiration configuration
variable "document_expiration_days" {
  description = "Number of days before document versions expire"
  type        = number
  default     = 365

  validation {
    condition     = var.document_expiration_days >= 365
    error_message = "Document expiration days must be at least 365 days"
  }
}

# Versioning configuration
variable "enable_versioning" {
  description = "Enable versioning for S3 buckets"
  type        = bool
  default     = true
}

# Encryption configuration
variable "enable_encryption" {
  description = "Enable server-side encryption for S3 buckets"
  type        = bool
  default     = true
}

# KMS key configuration for encryption
variable "kms_key_arn" {
  description = "ARN of KMS key for S3 bucket encryption"
  type        = string
  default     = null
}

# Bucket destruction configuration
variable "force_destroy" {
  description = "Allow destruction of non-empty buckets"
  type        = bool
  default     = false
}

# Additional tagging configuration
variable "tags" {
  description = "Additional tags for S3 buckets"
  type        = map(string)
  default     = {}
}