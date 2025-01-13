# Terraform AWS CloudFront Variables Configuration
# Version: 1.0
# Provider Version: hashicorp/terraform ~> 1.0

variable "environment" {
  type        = string
  description = "Environment name (e.g., dev, staging, prod)"
  
  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod"
  }
}

variable "domain_name" {
  type        = string
  description = "Domain name for the CloudFront distribution"
  
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-\\.]{1,61}[a-z0-9]\\.[a-z]{2,}$", var.domain_name))
    error_message = "Domain name must be a valid FQDN"
  }
}

variable "price_class" {
  type        = string
  description = "CloudFront distribution price class"
  default     = "PriceClass_100"
  
  validation {
    condition     = can(regex("^PriceClass_(100|200|All)$", var.price_class))
    error_message = "Price class must be PriceClass_100, PriceClass_200, or PriceClass_All"
  }
}

variable "min_ttl" {
  type        = number
  description = "Minimum TTL for cached objects in seconds"
  default     = 0
}

variable "default_ttl" {
  type        = number
  description = "Default TTL for cached objects in seconds"
  default     = 3600
}

variable "max_ttl" {
  type        = number
  description = "Maximum TTL for cached objects in seconds"
  default     = 86400
}

variable "enable_compression" {
  type        = bool
  description = "Enable compression for supported content types"
  default     = true
}

variable "ssl_protocol_version" {
  type        = string
  description = "Minimum SSL/TLS protocol version for viewer connections"
  default     = "TLSv1.2_2021"
  
  validation {
    condition     = can(regex("^TLSv1\\.(1|2)(_2021)?$", var.ssl_protocol_version))
    error_message = "SSL protocol version must be TLSv1.1, TLSv1.2, or TLSv1.2_2021"
  }
}

variable "tags" {
  type        = map(string)
  description = "Tags to be applied to the CloudFront distribution"
  default     = {}
}