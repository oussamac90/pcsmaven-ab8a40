# Port Community System - VPC Infrastructure Configuration
# terraform >= 1.0

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC Module Configuration
# Uses AWS VPC Terraform module version ~> 3.0
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 3.0"

  # Basic VPC Configuration
  name = "${var.environment}-vpc"
  cidr = var.vpc_cidr
  azs  = var.azs

  # Subnet Configuration
  private_subnets  = var.private_subnet_cidrs
  public_subnets   = var.public_subnet_cidrs
  database_subnets = var.database_subnet_cidrs

  # NAT Gateway Configuration
  enable_nat_gateway     = var.enable_nat_gateway
  single_nat_gateway     = var.single_nat_gateway
  enable_vpn_gateway     = var.enable_vpn_gateway
  enable_dns_hostnames   = true
  enable_dns_support     = true

  # Database Subnet Configuration
  create_database_subnet_group = true

  # VPC Flow Logs Configuration
  enable_flow_log                                = true
  create_flow_log_cloudwatch_log_group          = true
  create_flow_log_cloudwatch_iam_role           = true
  flow_log_max_aggregation_interval             = 60
  flow_log_cloudwatch_log_group_retention_in_days = 30

  # Public Subnet Configuration
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
    Type                     = "Public"
  }

  # Private Subnet Configuration
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
    Type                              = "Private"
  }

  # Database Subnet Configuration
  database_subnet_tags = {
    Type = "Database"
  }

  # VPC Endpoints for AWS Services
  enable_s3_endpoint       = true
  enable_dynamodb_endpoint = true

  # Default Security Group
  manage_default_security_group = true
  default_security_group_tags = {
    Name = "${var.environment}-default-sg"
  }

  # Resource Tags
  tags = merge(
    var.tags,
    {
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  )
}

# Outputs for use in other modules
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "database_subnets" {
  description = "List of IDs of database subnets"
  value       = module.vpc.database_subnets
}

output "private_route_table_ids" {
  description = "List of IDs of private route tables"
  value       = module.vpc.private_route_table_ids
}

output "public_route_table_ids" {
  description = "List of IDs of public route tables"
  value       = module.vpc.public_route_table_ids
}

output "database_subnet_group_name" {
  description = "Name of database subnet group"
  value       = module.vpc.database_subnet_group_name
}

output "vpc_flow_log_id" {
  description = "The ID of the VPC Flow Log"
  value       = module.vpc.vpc_flow_log_id
}

output "vpc_flow_log_destination_arn" {
  description = "The ARN of the VPC Flow Log destination"
  value       = module.vpc.vpc_flow_log_destination_arn
}