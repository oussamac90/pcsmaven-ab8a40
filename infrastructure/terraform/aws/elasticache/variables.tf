# Import common variables from parent module
variable "project" {
  description = "Project name used for resource naming and tagging"
  type        = string
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
}

# Redis node instance type configuration
variable "redis_node_type" {
  description = "Instance type for Redis nodes, optimized for high performance and sub-2-second response times"
  type        = string
  default     = "cache.r6g.xlarge"

  validation {
    condition     = can(regex("^cache\\.(t4g|r6g|m6g)\\.(medium|large|xlarge|2xlarge)$", var.redis_node_type))
    error_message = "Redis node type must be a valid AWS ElastiCache instance type with sufficient capacity for performance requirements"
  }
}

# Redis port configuration
variable "redis_port" {
  description = "Port number for Redis connections"
  type        = number
  default     = 6379

  validation {
    condition     = var.redis_port > 0 && var.redis_port < 65536
    error_message = "Redis port must be between 1 and 65535"
  }
}

# Redis version configuration
variable "redis_version" {
  description = "Redis engine version, must be 7.0 as per technical requirements"
  type        = string
  default     = "7.0"

  validation {
    condition     = can(regex("^7\\.0", var.redis_version))
    error_message = "Redis version must be 7.0 as specified in technical requirements"
  }
}

# Cache cluster configuration
variable "num_cache_clusters" {
  description = "Number of cache clusters (nodes) in the replication group for distributed caching"
  type        = number
  default     = 3

  validation {
    condition     = var.num_cache_clusters >= 2 && var.num_cache_clusters <= 6
    error_message = "Number of cache clusters must be between 2 and 6 for optimal performance and availability"
  }
}

# High availability configuration
variable "automatic_failover_enabled" {
  description = "Enable automatic failover for multi-AZ high availability"
  type        = bool
  default     = true
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ deployment for cross-AZ replication and high availability"
  type        = bool
  default     = true
}

# Parameter group configuration
variable "parameter_group_family" {
  description = "Redis parameter group family, must match Redis 7.0"
  type        = string
  default     = "redis7.0"

  validation {
    condition     = can(regex("^redis7\\.0$", var.parameter_group_family))
    error_message = "Parameter group family must be redis7.0"
  }
}

# Backup configuration
variable "snapshot_retention_limit" {
  description = "Number of days for which ElastiCache retains automatic snapshots"
  type        = number
  default     = 7

  validation {
    condition     = var.snapshot_retention_limit >= 0 && var.snapshot_retention_limit <= 35
    error_message = "Snapshot retention limit must be between 0 and 35 days"
  }
}

variable "snapshot_window" {
  description = "Daily time range during which automated backups are created"
  type        = string
  default     = "03:00-04:00"

  validation {
    condition     = can(regex("^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$", var.snapshot_window))
    error_message = "Snapshot window must be in the format HH:mm-HH:mm"
  }
}

# Maintenance configuration
variable "maintenance_window" {
  description = "Weekly time range for maintenance operations"
  type        = string
  default     = "sun:05:00-sun:06:00"

  validation {
    condition     = can(regex("^(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-5][0-9]-(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-5][0-9]$", var.maintenance_window))
    error_message = "Maintenance window must be in the format ddd:HH:mm-ddd:HH:mm"
  }
}