# Port Community System - ElastiCache Redis Configuration
# terraform >= 1.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "redis" {
  name        = "pcs-redis-subnet-group"
  description = "Subnet group for PCS Redis cluster"
  subnet_ids  = var.vpc.private_subnets
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "redis" {
  family      = "redis7.0"
  name        = "pcs-redis-params"
  description = "Custom parameters for PCS Redis cluster"

  # Performance optimization parameters
  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  parameter {
    name  = "activedefrag"
    value = "yes"
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "client-output-buffer-limit-normal-hard-limit"
    value = "0"
  }
}

# Security Group for Redis
resource "aws_security_group" "redis" {
  name        = "pcs-redis-sg"
  description = "Security group for PCS Redis cluster"
  vpc_id      = var.vpc.vpc_id

  ingress {
    description = "Redis access from private subnets"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [for subnet in var.vpc.private_subnets : cidrsubnet(var.vpc.vpc_cidr_block, 4, index(var.vpc.private_subnets, subnet))]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "pcs-redis-sg"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ElastiCache Replication Group
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "pcs-redis-cluster"
  description                   = "Redis cluster for Port Community System"
  engine_version               = "7.0"
  node_type                    = var.environment == "prod" ? "cache.r6g.xlarge" : "cache.t4g.medium"
  num_cache_clusters           = var.environment == "prod" ? 3 : 2
  parameter_group_name         = aws_elasticache_parameter_group.redis.name
  port                        = 6379
  automatic_failover_enabled   = true
  multi_az_enabled            = var.environment == "prod" ? true : false
  subnet_group_name           = aws_elasticache_subnet_group.redis.name
  security_group_ids          = [aws_security_group.redis.id]
  maintenance_window          = "sun:05:00-sun:09:00"
  snapshot_retention_limit    = var.environment == "prod" ? 7 : 1
  snapshot_window             = "00:00-05:00"
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true

  tags = {
    Name        = "pcs-redis-cluster"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Output values for other modules
output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.redis.port
}

output "redis_security_group_id" {
  description = "ID of the Redis security group"
  value       = aws_security_group.redis.id
}