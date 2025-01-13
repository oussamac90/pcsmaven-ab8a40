# Configure Terraform version and required providers
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Main AWS provider configuration for primary region
provider "aws" {
  region = var.aws_region

  # Enable default tags for all resources
  default_tags {
    tags = {
      Project      = "Port Community System"
      ManagedBy    = "Terraform"
      Environment  = var.environment
      SecurityLevel = "High"
      Compliance   = "GDPR"
    }
  }

  # Enable IAM role assumption for cross-account access
  assume_role {
    role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/TerraformExecutionRole"
  }
}

# Secondary AWS provider configuration for DR region
provider "aws" {
  alias  = "dr"
  region = "us-east-1"  # DR region as specified in architecture

  # Enable default tags for DR region resources
  default_tags {
    tags = {
      Project      = "Port Community System"
      ManagedBy    = "Terraform"
      Environment  = "dr"
      SecurityLevel = "High"
      Compliance   = "GDPR"
      Type         = "Disaster Recovery"
    }
  }

  # Enable IAM role assumption for DR region
  assume_role {
    role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/TerraformDRExecutionRole"
  }
}

# Data source to get current AWS account ID
data "aws_caller_identity" "current" {}

# Data source to get current AWS region
data "aws_region" "current" {}

# Provider feature flags
provider_meta "aws" {
  features {
    default_tags = true
    assume_role  = true
    multi_region = true
  }
}