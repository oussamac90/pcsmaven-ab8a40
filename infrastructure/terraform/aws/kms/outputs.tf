# Output definitions for AWS KMS resources used in the Port Community System
# These outputs expose key identifiers and properties for encryption and security

output "key_id" {
  description = "The globally unique identifier for the KMS key"
  value       = aws_kms_key.main.key_id
  sensitive   = false
}

output "key_arn" {
  description = "The Amazon Resource Name (ARN) of the KMS key"
  value       = aws_kms_key.main.arn
  sensitive   = false
}

output "alias_name" {
  description = "The display name of the KMS key alias"
  value       = aws_kms_alias.main.name
  sensitive   = false
}

output "alias_arn" {
  description = "The Amazon Resource Name (ARN) of the KMS key alias"
  value       = aws_kms_alias.main.arn
  sensitive   = false
}