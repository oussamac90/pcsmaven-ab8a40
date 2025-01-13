# Configure Terraform and required providers
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "pcs-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "pcs-terraform-locks"
  }
}

# Configure AWS Provider with region
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

# Define common tags for resource management
locals {
  common_tags = {
    Project       = var.project
    Environment   = var.environment
    ManagedBy     = "Terraform"
    SecurityLevel = var.security_level
    BackupPolicy  = var.backup_policy
  }

  # Environment-specific configurations
  is_production = var.environment == "production"
  is_dr         = var.environment == "dr"
}

# VPC Module for networking infrastructure
module "vpc" {
  source = "./vpc"

  project     = var.project
  environment = var.environment
  vpc_cidr    = var.vpc_cidr

  # High availability configurations
  enable_nat_gateway     = true
  single_nat_gateway     = !local.is_production
  enable_vpn_gateway     = local.is_production
  enable_transit_gateway = local.is_production

  # Security configurations
  enable_flow_logs         = true
  flow_logs_retention_days = 30
  enable_vpc_endpoints     = true

  # Availability Zones configuration
  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = [for i in range(3) : cidrsubnet(var.vpc_cidr, 4, i)]
  public_subnets  = [for i in range(3) : cidrsubnet(var.vpc_cidr, 4, i + 3)]
  
  tags = local.common_tags
}

# EKS Module for container orchestration
module "eks" {
  source = "./eks"

  project     = var.project
  environment = var.environment
  
  # Networking configuration
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets

  # Cluster configuration
  cluster_version = "1.26"
  cluster_name    = "${var.project}-${var.environment}-eks"

  # Security configurations
  enable_encryption          = true
  enable_pod_security_policy = true
  enable_network_policy      = true
  
  # Node group configuration
  node_groups = {
    default = {
      min_size        = local.is_production ? 3 : 1
      max_size        = local.is_production ? 10 : 3
      desired_size    = local.is_production ? 3 : 1
      instance_types  = ["m6g.large", "m6g.xlarge"]
      disk_size       = 100
      capacity_type   = local.is_production ? "ON_DEMAND" : "SPOT"
    }
  }

  # Add-ons configuration
  enable_cluster_autoscaler = true
  enable_metrics_server     = true
  enable_prometheus        = true
  enable_aws_load_balancer_controller = true

  tags = local.common_tags
}

# RDS Module for database services
module "rds" {
  source = "./rds"

  project     = var.project
  environment = var.environment

  # Network configuration
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets

  # Database configuration
  engine         = "postgres"
  engine_version = "14.7"
  instance_class = local.is_production ? "db.r6g.2xlarge" : "db.r6g.large"

  # High availability configuration
  multi_az             = local.is_production
  backup_retention_days = var.backup_retention_days
  
  # Security configuration
  storage_encrypted = true
  kms_key_id       = module.kms.rds_key_id

  tags = local.common_tags
}

# ElastiCache Module for caching layer
module "elasticache" {
  source = "./elasticache"

  project     = var.project
  environment = var.environment

  # Network configuration
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets

  # Redis configuration
  engine_version = "7.0"
  node_type      = local.is_production ? "cache.r6g.xlarge" : "cache.r6g.large"
  num_cache_nodes = local.is_production ? 3 : 1

  # Security configuration
  transit_encryption_enabled = true
  auth_token                = random_password.redis_auth.result

  tags = local.common_tags
}

# S3 Module for object storage
module "s3" {
  source = "./s3"

  project     = var.project
  environment = var.environment

  # Bucket configuration
  buckets = {
    documents = {
      versioning = true
      encryption = true
      lifecycle_rules = [{
        enabled = true
        transition = [{
          days          = 90
          storage_class = "STANDARD_IA"
        }]
      }]
    }
    backups = {
      versioning = true
      encryption = true
      lifecycle_rules = [{
        enabled = true
        transition = [{
          days          = 30
          storage_class = "GLACIER"
        }]
      }]
    }
  }

  tags = local.common_tags
}

# Route53 Module for DNS management
module "route53" {
  source = "./route53"

  project     = var.project
  environment = var.environment

  domain_name = "pcs.example.com"
  
  # DNS configurations
  enable_private_zone = true
  vpc_id             = module.vpc.vpc_id

  records = {
    api = {
      type = "ALIAS"
      alias = {
        name    = module.eks.cluster_endpoint
        zone_id = module.eks.cluster_zone_id
      }
    }
  }

  tags = local.common_tags
}

# KMS Module for encryption key management
module "kms" {
  source = "./kms"

  project     = var.project
  environment = var.environment

  # Key configurations
  keys = {
    rds = {
      description = "RDS encryption key"
      enable_key_rotation = true
    }
    s3 = {
      description = "S3 encryption key"
      enable_key_rotation = true
    }
  }

  tags = local.common_tags
}

# Outputs for reference by other configurations
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
}

output "elasticache_endpoint" {
  description = "ElastiCache endpoint"
  value       = module.elasticache.endpoint
}