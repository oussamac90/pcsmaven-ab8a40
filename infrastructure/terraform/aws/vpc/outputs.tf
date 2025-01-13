# VPC Identifier Output
output "vpc_id" {
  description = "The ID of the VPC created for the Port Community System"
  value       = module.vpc.vpc_id
  sensitive   = false
}

# Subnet Outputs
output "private_subnets" {
  description = "List of private subnet IDs for application workload deployment (EKS nodes, application servers)"
  value       = module.vpc.private_subnets
  sensitive   = false
}

output "public_subnets" {
  description = "List of public subnet IDs for internet-facing resources (ALB, NAT gateways)"
  value       = module.vpc.public_subnets
  sensitive   = false
}

output "database_subnets" {
  description = "List of database subnet IDs for RDS instances and other data stores"
  value       = module.vpc.database_subnets
  sensitive   = false
}

# Database Subnet Group
output "database_subnet_group_name" {
  description = "Name of the database subnet group for RDS instance deployment"
  value       = module.vpc.database_subnet_group_name
  sensitive   = false
}

# Route Table Outputs
output "private_route_table_ids" {
  description = "List of private route table IDs for custom route configuration and VPC endpoints"
  value       = module.vpc.private_route_table_ids
  sensitive   = false
}

output "public_route_table_ids" {
  description = "List of public route table IDs for internet gateway and custom route configuration"
  value       = module.vpc.public_route_table_ids
  sensitive   = false
}

# VPC CIDR Output
output "vpc_cidr_block" {
  description = "The primary CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
  sensitive   = false
}

# NAT Gateway Outputs
output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs for private subnet internet access"
  value       = module.vpc.natgw_ids
  sensitive   = false
}

# VPC Default Security Group
output "default_security_group_id" {
  description = "ID of the VPC default security group"
  value       = module.vpc.default_security_group_id
  sensitive   = false
}

# VPC Flow Logs
output "vpc_flow_log_id" {
  description = "The ID of the VPC Flow Log for network traffic monitoring"
  value       = module.vpc.vpc_flow_log_id
  sensitive   = false
}

output "vpc_flow_log_destination_arn" {
  description = "The ARN of the CloudWatch Log Group for VPC Flow Logs"
  value       = module.vpc.vpc_flow_log_destination_arn
  sensitive   = false
}

# VPC Endpoints
output "vpc_endpoint_s3_id" {
  description = "ID of the S3 VPC Endpoint for secure AWS service access"
  value       = module.vpc.vpc_endpoint_s3_id
  sensitive   = false
}

output "vpc_endpoint_dynamodb_id" {
  description = "ID of the DynamoDB VPC Endpoint for secure AWS service access"
  value       = module.vpc.vpc_endpoint_dynamodb_id
  sensitive   = false
}

# Availability Zones
output "azs" {
  description = "List of availability zones used for VPC subnets"
  value       = module.vpc.azs
  sensitive   = false
}