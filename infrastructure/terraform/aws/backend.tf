# Backend configuration for secure and highly available Terraform state management
# Version: ~> 1.0
# Purpose: Defines the state storage and locking mechanism using AWS S3 and DynamoDB

terraform {
  backend "s3" {
    # S3 bucket for state storage with environment isolation
    bucket = "${var.project}-terraform-state-${var.environment}"
    
    # State file path with workspace support
    key = "terraform.tfstate"
    
    # AWS region for state storage and replication source
    region = var.aws_region
    
    # Enable server-side encryption with custom KMS key
    encrypt = true
    kms_key_id = var.kms_key_arn
    
    # DynamoDB table for state locking with TTL
    dynamodb_table = "${var.project}-terraform-locks-${var.environment}"
    
    # Workspace organization for environment isolation
    workspace_key_prefix = var.environment
    
    # Enable versioning for state history
    versioning = true
    
    # Restrict bucket access
    acl = "private"
    
    # Enhanced security settings
    force_path_style = false
    sse_algorithm    = "aws:kms"
    
    # Access logging configuration
    access_logging = {
      target_bucket = "${var.project}-terraform-logs-${var.environment}"
      target_prefix = "terraform-state-access-logs/"
    }
    
    # Cross-region replication settings
    replication_configuration = {
      role = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/terraform-state-replication"
      rules = [
        {
          id       = "terraform-state-replication"
          status   = "Enabled"
          priority = 1
          
          destination = {
            bucket        = "arn:aws:s3:::${var.project}-terraform-state-dr"
            storage_class = "STANDARD_IA"
            
            replica_kms_key_id = var.dr_kms_key_arn
            account_id         = data.aws_caller_identity.current.account_id
          }
          
          source_selection_criteria = {
            sse_kms_encrypted_objects = {
              enabled = true
            }
          }
        }
      ]
    }
    
    # Lifecycle rules for state file management
    lifecycle_rule = [
      {
        id      = "state-version-lifecycle"
        enabled = true
        
        noncurrent_version_transition = [
          {
            days          = 30
            storage_class = "STANDARD_IA"
          }
        ]
        
        noncurrent_version_expiration = {
          days = 90
        }
      }
    ]
    
    # DynamoDB settings for state locking
    dynamodb_table_settings = {
      billing_mode = "PAY_PER_REQUEST"
      hash_key     = "LockID"
      
      attribute = [
        {
          name = "LockID"
          type = "S"
        }
      ]
      
      ttl = {
        attribute_name = "TimeToLive"
        enabled       = true
      }
      
      point_in_time_recovery = {
        enabled = true
      }
      
      tags = {
        Project     = var.project
        Environment = var.environment
        ManagedBy   = "Terraform"
        Purpose     = "State Locking"
      }
    }
  }
}

# Data source for current AWS account information
data "aws_caller_identity" "current" {}