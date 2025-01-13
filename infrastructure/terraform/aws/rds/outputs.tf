# Port Community System - RDS PostgreSQL Output Configuration
# Exposes critical database connection and configuration information
# terraform >= 1.0

# Connection Information
output "db_instance_endpoint" {
  description = "The connection endpoint for the RDS instance in address:port format"
  value       = aws_db_instance.main.endpoint
  sensitive   = false
}

output "db_instance_address" {
  description = "The hostname of the RDS instance"
  value       = aws_db_instance.main.address
  sensitive   = false
}

output "db_instance_port" {
  description = "The port on which the RDS instance accepts connections"
  value       = aws_db_instance.main.port
  sensitive   = false
}

# Resource Identifiers
output "db_instance_id" {
  description = "The RDS instance identifier"
  value       = aws_db_instance.main.id
  sensitive   = false
}

output "db_instance_arn" {
  description = "The ARN of the RDS instance for IAM policy configuration"
  value       = aws_db_instance.main.arn
  sensitive   = false
}

# High Availability Configuration
output "db_instance_availability_zone" {
  description = "The availability zone of the RDS instance"
  value       = aws_db_instance.main.availability_zone
  sensitive   = false
}

output "db_instance_multi_az" {
  description = "Whether the RDS instance is multi-AZ"
  value       = aws_db_instance.main.multi_az
  sensitive   = false
}

# Backup Configuration
output "db_instance_backup_retention_period" {
  description = "The backup retention period in days"
  value       = aws_db_instance.main.backup_retention_period
  sensitive   = false
}

output "db_instance_backup_window" {
  description = "The daily time range during which automated backups are created"
  value       = aws_db_instance.main.backup_window
  sensitive   = false
}

# Network Configuration
output "db_subnet_group_name" {
  description = "The name of the database subnet group"
  value       = aws_db_instance.main.db_subnet_group_name
  sensitive   = false
}

output "db_security_group_id" {
  description = "The security group ID associated with the RDS instance"
  value       = aws_security_group.rds.id
  sensitive   = false
}

# Performance and Monitoring
output "db_instance_monitoring_role_arn" {
  description = "The ARN of the IAM role used for enhanced monitoring"
  value       = aws_db_instance.main.monitoring_role_arn
  sensitive   = false
}

output "db_instance_performance_insights_enabled" {
  description = "Whether Performance Insights is enabled"
  value       = aws_db_instance.main.performance_insights_enabled
  sensitive   = false
}

# Status Information
output "db_instance_status" {
  description = "The current status of the RDS instance"
  value       = aws_db_instance.main.status
  sensitive   = false
}

# Security Configuration
output "db_instance_storage_encrypted" {
  description = "Whether the RDS instance storage is encrypted"
  value       = aws_db_instance.main.storage_encrypted
  sensitive   = false
}

output "db_instance_kms_key_id" {
  description = "The ARN of the KMS key used for storage encryption"
  value       = aws_db_instance.main.kms_key_id
  sensitive   = true
}

output "db_instance_iam_authentication_enabled" {
  description = "Whether IAM database authentication is enabled"
  value       = aws_db_instance.main.iam_database_authentication_enabled
  sensitive   = false
}

# Resource Tags
output "db_instance_tags_all" {
  description = "A map of tags assigned to the RDS instance"
  value       = aws_db_instance.main.tags_all
  sensitive   = false
}