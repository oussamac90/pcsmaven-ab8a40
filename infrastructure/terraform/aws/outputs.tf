# Port Community System - Root Infrastructure Outputs
# Aggregates critical infrastructure information from all AWS service modules
# terraform >= 1.0

# Kubernetes Cluster Configuration
output "kubernetes_cluster" {
  description = "EKS cluster configuration for Kubernetes deployments including endpoints and security details"
  value = {
    endpoint           = module.eks.cluster_endpoint
    name              = module.eks.cluster_name
    version           = module.eks.cluster_version
    security_group_id = module.eks.cluster_security_group_id
    oidc_issuer_url   = module.eks.cluster_oidc_issuer_url
    certificate_authority_data = module.eks.cluster_certificate_authority_data
    node_group = {
      arn    = module.eks.node_group_arn
      status = module.eks.node_group_status
    }
  }
  sensitive = false
}

# Database Configuration
output "database" {
  description = "RDS PostgreSQL instance configuration including primary and replica endpoints"
  value = {
    primary_endpoint = module.rds.db_instance_endpoint
    address         = module.rds.db_instance_address
    port            = module.rds.db_instance_port
    identifier      = module.rds.db_instance_id
    arn            = module.rds.db_instance_arn
    availability_zone = module.rds.db_instance_availability_zone
    multi_az        = module.rds.db_instance_multi_az
    subnet_group    = module.rds.db_subnet_group_name
    security_group_id = module.rds.db_security_group_id
    monitoring = {
      role_arn = module.rds.db_instance_monitoring_role_arn
      insights_enabled = module.rds.db_instance_performance_insights_enabled
    }
    backup = {
      retention_period = module.rds.db_instance_backup_retention_period
      window          = module.rds.db_instance_backup_window
    }
    encryption = {
      enabled = module.rds.db_instance_storage_encrypted
      kms_key_id = module.rds.db_instance_kms_key_id
    }
  }
  sensitive = false
}

# Redis Cache Configuration
output "redis" {
  description = "ElastiCache Redis cluster configuration for distributed caching"
  value = {
    cluster = {
      id                    = module.elasticache.redis_cluster.id
      primary_endpoint      = module.elasticache.redis_cluster.primary_endpoint
      reader_endpoint       = module.elasticache.redis_cluster.reader_endpoint
      configuration_endpoint = module.elasticache.redis_cluster.configuration_endpoint
      port                 = module.elasticache.redis_cluster.port
    }
    connection_strings = {
      primary = module.elasticache.redis_connection_string
      reader  = module.elasticache.redis_reader_connection_string
    }
    cluster_mode = {
      enabled   = module.elasticache.redis_cluster.cluster_mode.enabled
      num_nodes = module.elasticache.redis_cluster.cluster_mode.num_nodes
    }
    parameter_group = {
      id     = module.elasticache.redis_cluster.parameter_group.id
      name   = module.elasticache.redis_cluster.parameter_group.name
      family = module.elasticache.redis_cluster.parameter_group.family
    }
  }
  sensitive = false
}

# Environment Configuration
output "environment" {
  description = "Environment-specific configuration for deployment context"
  value = {
    name = var.environment
    region = var.aws_region
    vpc = {
      id                = module.vpc.vpc_id
      cidr_block       = module.vpc.vpc_cidr_block
      private_subnets  = module.vpc.private_subnets
      public_subnets   = module.vpc.public_subnets
      database_subnets = module.vpc.database_subnets
    }
    security = {
      kms_key_id     = module.kms.key_id
      kms_key_arn    = module.kms.key_arn
      kms_alias_name = module.kms.alias_name
      kms_alias_arn  = module.kms.alias_arn
    }
    network = {
      nat_gateway_ids = module.vpc.nat_gateway_ids
      route_tables = {
        private = module.vpc.private_route_table_ids
        public  = module.vpc.public_route_table_ids
      }
      vpc_endpoints = {
        s3       = module.vpc.vpc_endpoint_s3_id
        dynamodb = module.vpc.vpc_endpoint_dynamodb_id
      }
    }
    monitoring = {
      vpc_flow_log_id = module.vpc.vpc_flow_log_id
      vpc_flow_log_destination = module.vpc.vpc_flow_log_destination_arn
    }
  }
  sensitive = false
}