# Core Terraform configuration
terraform {
  required_version = "~> 1.0"
}

# Environment variable with validation
variable "environment" {
  type        = string
  description = "Deployment environment (development, staging, production)"
  
  validation {
    condition     = can(regex("^(development|staging|production)$", var.environment))
    error_message = "Environment must be development, staging, or production"
  }
}

# RDS instance class with validation for supported types
variable "db_instance_class" {
  type        = string
  description = "RDS instance type"
  default     = "db.r6g.xlarge"
  
  validation {
    condition     = can(regex("^db\\.(t3|r6g|r6i)\\.", var.db_instance_class))
    error_message = "Instance class must be a valid RDS instance type"
  }
}

# PostgreSQL engine version with validation
variable "db_engine_version" {
  type        = string
  description = "PostgreSQL engine version"
  default     = "15.3"
  
  validation {
    condition     = can(regex("^\\d+\\.\\d+$", var.db_engine_version))
    error_message = "Engine version must be in major.minor format"
  }
}

# Storage allocation with validation
variable "db_allocated_storage" {
  type        = number
  description = "Allocated storage in gigabytes"
  default     = 100
  
  validation {
    condition     = var.db_allocated_storage >= 20 && var.db_allocated_storage <= 16384
    error_message = "Allocated storage must be between 20 and 16384 GB"
  }
}

# Maximum storage limit for autoscaling
variable "db_max_allocated_storage" {
  type        = number
  description = "Maximum storage limit for autoscaling"
  default     = 1000
  
  validation {
    condition     = var.db_max_allocated_storage >= var.db_allocated_storage
    error_message = "Max allocated storage must be greater than or equal to allocated storage"
  }
}

# High availability configuration
variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for high availability"
  default     = true
}

# Backup configuration
variable "backup_retention_period" {
  type        = number
  description = "Backup retention period in days"
  default     = 30
  
  validation {
    condition     = var.backup_retention_period >= 0 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 0 and 35 days"
  }
}

# Database protection settings
variable "deletion_protection" {
  type        = bool
  description = "Enable deletion protection"
  default     = true
}

variable "skip_final_snapshot" {
  type        = bool
  description = "Skip final snapshot when destroying database"
  default     = false
}