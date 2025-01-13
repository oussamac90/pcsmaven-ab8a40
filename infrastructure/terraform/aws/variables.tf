# Core Terraform functionality for variable definitions and validation
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 1.0"
    }
  }
}

# Project name used for resource naming and tagging across all AWS services
variable "project" {
  description = "Project name used for resource naming and tagging across all AWS services"
  type        = string
  default     = "pcs"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens"
  }
}

# Deployment environment determining resource configuration and scaling policies
variable "environment" {
  description = "Deployment environment determining resource configuration and scaling policies"
  type        = string

  validation {
    condition     = can(regex("^(development|staging|production|dr)$", var.environment))
    error_message = "Environment must be development, staging, production, or dr"
  }
}

# AWS region for resource deployment with multi-region support
variable "aws_region" {
  description = "AWS region for resource deployment with multi-region support"
  type        = string
  default     = "us-west-2"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d$", var.aws_region))
    error_message = "AWS region must be in valid format (e.g., us-west-2)"
  }
}

# Enable encryption for sensitive data across all AWS services
variable "enable_encryption" {
  description = "Enable encryption for sensitive data across all AWS services including storage and transit"
  type        = bool
  default     = true
}

# Default backup retention period for databases and critical data
variable "backup_retention_days" {
  description = "Default backup retention period in days for databases and critical data"
  type        = number
  default     = 30

  validation {
    condition     = var.backup_retention_days >= 0 && var.backup_retention_days <= 35
    error_message = "Backup retention days must be between 0 and 35"
  }
}

# Multi-AZ deployment configuration for high availability
variable "multi_az_enabled" {
  description = "Enable Multi-AZ deployment for high availability across all supported services"
  type        = bool
  default     = true
}

# VPC CIDR block configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC network configuration"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be in valid CIDR notation"
  }
}

# Common resource tags
variable "tags" {
  description = "Common tags applied to all AWS resources for organization and cost tracking"
  type        = map(string)
  default = {
    Project      = "Port Community System"
    ManagedBy    = "Terraform"
    Environment  = "var.environment"
    SecurityLevel = "High"
    Compliance   = "GDPR"
  }
}

# Output variables for use in other modules
output "project" {
  description = "Project name for consistent resource naming across modules"
  value       = var.project
}

output "environment" {
  description = "Environment name for environment-specific configurations"
  value       = var.environment
}

output "aws_region" {
  description = "AWS region for consistent resource deployment location"
  value       = var.aws_region
}

output "tags" {
  description = "Common tags for consistent resource tagging across modules"
  value       = var.tags
}