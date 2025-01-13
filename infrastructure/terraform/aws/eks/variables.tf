# Core cluster configuration variables
variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "pcs-eks-cluster"

  validation {
    condition     = length(var.cluster_name) <= 100
    error_message = "Cluster name must be less than 100 characters"
  }
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.26"

  validation {
    condition     = can(regex("^1\\.(2[4-6])$", var.cluster_version))
    error_message = "Cluster version must be 1.24, 1.25, or 1.26"
  }
}

# Node group configuration variables
variable "node_group_name" {
  description = "Name of the EKS node group"
  type        = string
  default     = "pcs-node-group"
}

variable "node_instance_types" {
  description = "List of instance types for the EKS node group"
  type        = list(string)
  default     = ["r6g.xlarge"]
}

variable "node_desired_size" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 3

  validation {
    condition     = var.node_desired_size >= 3 && var.node_desired_size <= 10
    error_message = "Desired node count must be between 3 and 10"
  }
}

variable "node_min_size" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 3

  validation {
    condition     = var.node_min_size >= 3
    error_message = "Minimum node count must be at least 3"
  }
}

variable "node_max_size" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 10

  validation {
    condition     = var.node_max_size <= 10
    error_message = "Maximum node count must not exceed 10"
  }
}

variable "node_disk_size" {
  description = "Disk size in GiB for worker nodes"
  type        = number
  default     = 100

  validation {
    condition     = var.node_disk_size >= 100
    error_message = "Disk size must be at least 100 GiB"
  }
}

# Network configuration variables
variable "enable_private_access" {
  description = "Enable private API server endpoint access"
  type        = bool
  default     = true
}

variable "enable_public_access" {
  description = "Enable public API server endpoint access"
  type        = bool
  default     = true
}

variable "cluster_encryption_config_enabled" {
  description = "Enable envelope encryption for cluster secrets"
  type        = bool
  default     = true
}

variable "private_subnets" {
  description = "List of private subnet IDs for the EKS cluster"
  type        = list(string)
}

variable "public_subnets" {
  description = "List of public subnet IDs for the EKS cluster"
  type        = list(string)
}

# Resource tagging variables
variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Environment = "production"
    Project     = "pcs"
    ManagedBy   = "terraform"
  }
}