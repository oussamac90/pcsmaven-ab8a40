# Terraform AWS VPC Variables
# terraform >= 1.0

variable "environment" {
  type        = string
  description = "Environment identifier for resource naming (dev, staging, prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region for VPC deployment"
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", var.aws_region))
    error_message = "AWS region must be in format: xx-xxxx-#."
  }
}

variable "vpc_cidr" {
  type        = string
  description = "Primary CIDR block for the VPC"
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "azs" {
  type        = list(string)
  description = "List of availability zones for multi-AZ deployment"
  validation {
    condition     = length(var.azs) >= 2
    error_message = "At least 2 availability zones must be specified for high availability."
  }
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets hosting application workloads"
  validation {
    condition     = length(var.private_subnet_cidrs) >= 2
    error_message = "At least 2 private subnet CIDRs must be specified for high availability."
  }
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets hosting load balancers"
  validation {
    condition     = length(var.public_subnet_cidrs) >= 2
    error_message = "At least 2 public subnet CIDRs must be specified for high availability."
  }
}

variable "database_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for database subnets hosting RDS instances"
  validation {
    condition     = length(var.database_subnet_cidrs) >= 2
    error_message = "At least 2 database subnet CIDRs must be specified for high availability."
  }
}

variable "enable_nat_gateway" {
  type        = bool
  description = "Flag to enable NAT Gateway for private subnet internet access"
  default     = true
}

variable "single_nat_gateway" {
  type        = bool
  description = "Flag to use a single NAT Gateway instead of one per AZ"
  default     = false
}

variable "enable_vpn_gateway" {
  type        = bool
  description = "Flag to enable VPN Gateway for hybrid connectivity"
  default     = false
}

variable "tags" {
  type        = map(string)
  description = "Resource tags for cost allocation and organization"
  default = {
    Terraform   = "true"
    Application = "pcs"
  }
  validation {
    condition     = contains(keys(var.tags), "Application")
    error_message = "Tags must include an 'Application' key."
  }
}