# EKS Cluster Outputs
output "cluster_endpoint" {
  description = "Endpoint URL for the EKS cluster API server"
  value       = aws_eks_cluster.main.endpoint
  sensitive   = false
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required for cluster authentication"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster for network access control"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
  sensitive   = false
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN used by the EKS cluster for AWS service permissions"
  value       = aws_eks_cluster.main.role_arn
  sensitive   = false
}

output "cluster_name" {
  description = "Name identifier of the EKS cluster"
  value       = aws_eks_cluster.main.name
  sensitive   = false
}

output "cluster_version" {
  description = "Kubernetes version running on the EKS cluster"
  value       = aws_eks_cluster.main.version
  sensitive   = false
}

output "node_group_arn" {
  description = "ARN of the EKS node group for worker nodes"
  value       = aws_eks_node_group.main.arn
  sensitive   = false
}

output "node_group_status" {
  description = "Current status of the EKS node group for health monitoring"
  value       = aws_eks_node_group.main.status
  sensitive   = false
}