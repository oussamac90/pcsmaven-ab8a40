# Port Community System - RDS PostgreSQL Configuration
# terraform >= 1.0

terraform {
  required_version = "~> 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Data sources for VPC and KMS configurations
data "aws_vpc" "vpc" {
  id = data.terraform_remote_state.vpc.outputs.vpc_id
}

data "aws_kms_key" "kms" {
  key_id = data.terraform_remote_state.kms.outputs.key_id
}

# DB subnet group for RDS instance placement
resource "aws_db_subnet_group" "main" {
  name        = "${var.environment}-pcs-db-subnet-group"
  description = "Database subnet group for Port Community System RDS"
  subnet_ids  = data.terraform_remote_state.vpc.outputs.database_subnets

  tags = {
    Name        = "${var.environment}-pcs-db-subnet-group"
    Environment = var.environment
    Project     = "PCS"
    ManagedBy   = "terraform"
  }
}

# Security group for RDS access control
resource "aws_security_group" "rds" {
  name        = "${var.environment}-pcs-rds-sg"
  description = "Security group for Port Community System RDS instance"
  vpc_id      = data.aws_vpc.vpc.id

  ingress {
    description = "PostgreSQL access from VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.vpc.vpc_cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-pcs-rds-sg"
    Environment = var.environment
    Project     = "PCS"
    ManagedBy   = "terraform"
  }
}

# RDS parameter group for PostgreSQL optimization
resource "aws_db_parameter_group" "main" {
  name        = "${var.environment}-pcs-pg13"
  family      = "postgres13"
  description = "Custom parameter group for Port Community System RDS"

  parameter {
    name  = "max_connections"
    value = "1000"
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4096}"
  }

  parameter {
    name  = "work_mem"
    value = "16384"
  }

  tags = {
    Name        = "${var.environment}-pcs-pg13"
    Environment = var.environment
    Project     = "PCS"
    ManagedBy   = "terraform"
  }
}

# RDS instance for PostgreSQL database
resource "aws_db_instance" "main" {
  identifier = "${var.environment}-pcs-postgresql"
  
  # Engine configuration
  engine                = "postgres"
  engine_version        = var.db_engine_version
  instance_class        = var.db_instance_class
  parameter_group_name  = aws_db_parameter_group.main.name
  
  # Storage configuration
  allocated_storage      = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = data.aws_kms_key.kms.arn
  
  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  multi_az              = var.environment == "production" ? true : false
  publicly_accessible   = false
  
  # Backup configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot  = true
  
  # Performance and monitoring
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  monitoring_interval            = 60
  monitoring_role_arn           = aws_iam_role.rds_monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  # Security configuration
  username               = var.db_username
  password               = var.db_password
  iam_database_authentication_enabled = true
  deletion_protection    = var.environment == "production" ? true : false
  skip_final_snapshot    = var.environment == "production" ? false : true
  final_snapshot_identifier = var.environment == "production" ? "${var.environment}-pcs-final-snapshot" : null

  tags = {
    Name           = "${var.environment}-pcs-postgresql"
    Environment    = var.environment
    Project        = "PCS"
    ManagedBy      = "terraform"
    BackupEnabled  = "true"
    EncryptionType = "KMS"
  }

  lifecycle {
    prevent_destroy = var.environment == "production" ? true : false
  }
}

# IAM role for RDS enhanced monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.environment}-pcs-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-pcs-rds-monitoring"
    Environment = var.environment
    Project     = "PCS"
    ManagedBy   = "terraform"
  }
}

# Attach the enhanced monitoring policy to the IAM role
resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Outputs for other modules
output "db_instance_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_id" {
  description = "The identifier of the RDS instance"
  value       = aws_db_instance.main.id
}

output "db_subnet_group_name" {
  description = "The name of the database subnet group"
  value       = aws_db_subnet_group.main.name
}

output "db_security_group_id" {
  description = "The ID of the database security group"
  value       = aws_security_group.rds.id
}