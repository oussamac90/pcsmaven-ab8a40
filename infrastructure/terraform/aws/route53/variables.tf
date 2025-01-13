# Core domain name variable for the Port Community System
variable "domain_name" {
  type        = string
  description = "Primary domain name for the Port Community System"

  validation {
    condition     = can(regex("^([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\\.)+[a-zA-Z]{2,}$", var.domain_name))
    error_message = "The domain_name value must be a valid domain name format."
  }
}

# Environment identifier for resource naming and tagging
variable "environment" {
  type        = string
  description = "Deployment environment identifier"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "The environment value must be one of: dev, staging, prod."
  }
}

# API Gateway custom domain configuration
variable "api_gateway_domain" {
  type        = string
  description = "API Gateway custom domain for DNS record creation"

  validation {
    condition     = can(regex("^([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\\.)+[a-zA-Z]{2,}$", var.api_gateway_domain))
    error_message = "The api_gateway_domain value must be a valid domain name format."
  }
}

# API Gateway hosted zone ID for alias records
variable "api_gateway_zone_id" {
  type        = string
  description = "API Gateway hosted zone ID for alias records"

  validation {
    condition     = can(regex("^Z[A-Z0-9]+$", var.api_gateway_zone_id))
    error_message = "The api_gateway_zone_id must be a valid AWS hosted zone ID format (e.g., Z2FDTNDATAQYW2)."
  }
}

# Health check configuration for DNS failover
variable "enable_health_check" {
  type        = bool
  description = "Enable Route53 health checks for DNS failover"
  default     = true
}

# Resource tagging configuration
variable "tags" {
  type        = map(string)
  description = "Additional tags for Route53 resources"
  default = {
    ManagedBy = "Terraform"
    Project   = "PCS"
  }

  validation {
    condition     = length(var.tags) > 0
    error_message = "At least one tag must be specified."
  }
}

# DNS failover configuration for multi-region support
variable "failover_regions" {
  type = list(object({
    region     = string
    is_primary = bool
  }))
  description = "List of regions for DNS failover configuration"
  default = [
    {
      region     = "us-east-1"
      is_primary = true
    },
    {
      region     = "us-west-2"
      is_primary = false
    }
  ]

  validation {
    condition     = length([for r in var.failover_regions : r if r.is_primary]) == 1
    error_message = "Exactly one region must be designated as primary."
  }
}

# Health check configuration
variable "health_check_config" {
  type = object({
    port                = number
    type                = string
    resource_path       = string
    failure_threshold   = number
    request_interval    = number
    measure_latency     = bool
    regions            = list(string)
  })
  description = "Configuration for Route53 health checks"
  default = {
    port                = 443
    type                = "HTTPS"
    resource_path       = "/health"
    failure_threshold   = 3
    request_interval    = 30
    measure_latency     = true
    regions            = ["us-east-1", "us-west-2", "eu-west-1"]
  }

  validation {
    condition     = contains(["HTTP", "HTTPS", "TCP"], var.health_check_config.type)
    error_message = "Health check type must be one of: HTTP, HTTPS, TCP."
  }
}

# SSL/TLS certificate validation configuration
variable "certificate_validation" {
  type = object({
    method      = string
    wait_for_validation = bool
  })
  description = "Configuration for ACM certificate validation via DNS"
  default = {
    method      = "DNS"
    wait_for_validation = true
  }

  validation {
    condition     = contains(["DNS", "EMAIL"], var.certificate_validation.method)
    error_message = "Certificate validation method must be either DNS or EMAIL."
  }
}