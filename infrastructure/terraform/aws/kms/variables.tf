# Core Terraform functionality for variable definitions
terraform {
  required_providers {
    terraform = {
      source  = "hashicorp/terraform"
      version = "~> 1.0"
    }
  }
}

# Duration in days before key deletion
variable "key_deletion_window" {
  description = "Duration in days before key deletion"
  type        = number
  default     = 30

  validation {
    condition     = var.key_deletion_window >= 7 && var.key_deletion_window <= 30
    error_message = "Key deletion window must be between 7 and 30 days"
  }
}

# Enable automatic key rotation
variable "enable_key_rotation" {
  description = "Enable automatic key rotation"
  type        = bool
  default     = true
}

# Enable multi-region key replication
variable "multi_region_replica" {
  description = "Enable multi-region key replication for disaster recovery"
  type        = bool
  default     = true
}

# List of AWS regions for key replication
variable "replica_regions" {
  description = "List of AWS regions for key replication"
  type        = list(string)
  default     = []

  validation {
    condition     = length(var.replica_regions) > 0
    error_message = "At least one replica region must be specified for DR compliance"
  }
}

# Intended usage of the KMS key
variable "key_usage" {
  description = "Intended usage of the KMS key"
  type        = string
  default     = "ENCRYPT_DECRYPT"

  validation {
    condition     = contains(["ENCRYPT_DECRYPT", "SIGN_VERIFY"], var.key_usage)
    error_message = "Key usage must be either ENCRYPT_DECRYPT or SIGN_VERIFY"
  }
}

# Data classification level for key usage
variable "data_classification" {
  description = "Data classification level for key usage"
  type        = string
  default     = "CONFIDENTIAL"

  validation {
    condition     = contains(["CRITICAL", "CONFIDENTIAL", "INTERNAL", "PUBLIC"], var.data_classification)
    error_message = "Invalid data classification level specified"
  }
}

# List of required security and compliance tags
variable "required_tags" {
  description = "List of required security and compliance tags"
  type        = list(string)
  default     = ["DataClassification", "SecurityCompliance", "KeyRotation"]

  validation {
    condition     = length(var.required_tags) >= 3
    error_message = "Minimum required security tags not specified"
  }
}

# List of IAM ARNs allowed to administer the key
variable "key_administrators" {
  description = "List of IAM ARNs allowed to administer the key"
  type        = list(string)
  default     = []

  validation {
    condition     = length(var.key_administrators) > 0
    error_message = "At least one key administrator must be specified"
  }
}

# List of IAM ARNs allowed to use the key
variable "key_users" {
  description = "List of IAM ARNs allowed to use the key"
  type        = list(string)
  default     = []

  validation {
    condition     = length(var.key_users) > 0
    error_message = "At least one key user must be specified"
  }
}

# Specifies the cryptographic configuration of the key
variable "key_spec" {
  description = "Specifies the cryptographic configuration of the key"
  type        = string
  default     = "SYMMETRIC_DEFAULT"

  validation {
    condition     = contains(["SYMMETRIC_DEFAULT", "RSA_2048", "RSA_3072", "RSA_4096", "ECC_NIST_P256", "ECC_NIST_P384", "ECC_NIST_P521"], var.key_spec)
    error_message = "Invalid key specification provided"
  }
}

# Version of the compliance policy to apply
variable "compliance_policy_version" {
  description = "Version of the compliance policy to apply"
  type        = string
  default     = "1.0"

  validation {
    condition     = can(regex("^\\d+\\.\\d+$", var.compliance_policy_version))
    error_message = "Compliance policy version must be in format X.Y"
  }
}

# Additional tags for KMS resources
variable "tags" {
  description = "Additional tags for KMS resources"
  type        = map(string)
  default     = {}

  validation {
    condition     = can(lookup(var.tags, "Environment", null)) && can(lookup(var.tags, "SecurityLevel", null))
    error_message = "Tags must include Environment and SecurityLevel"
  }
}