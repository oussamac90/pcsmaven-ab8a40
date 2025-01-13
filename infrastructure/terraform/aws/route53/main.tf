# AWS Route53 configuration for Port Community System DNS management

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Primary hosted zone for the domain
resource "aws_route53_zone" "main" {
  name          = var.domain_name
  comment       = "Managed by Terraform - Port Community System ${var.environment}"
  force_destroy = false

  tags = merge(
    var.tags,
    {
      Name        = "pcs-${var.environment}-zone"
      Environment = var.environment
    }
  )
}

# API Gateway domain record with health-based routing
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.api_gateway_domain
    zone_id               = var.api_gateway_zone_id
    evaluate_target_health = true
  }

  health_check_id = var.enable_health_check ? aws_route53_health_check.primary[0].id : null

  set {
    failover = "PRIMARY"
    health_check_id = var.enable_health_check ? aws_route53_health_check.primary[0].id : null
  }
}

# Web application record for the main domain
resource "aws_route53_record" "web" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.api_gateway_domain
    zone_id               = var.api_gateway_zone_id
    evaluate_target_health = true
  }
}

# Health check for API endpoint monitoring
resource "aws_route53_health_check" "primary" {
  count = var.enable_health_check ? 1 : 0

  fqdn              = "api.${var.domain_name}"
  port              = var.health_check_config.port
  type              = var.health_check_config.type
  resource_path     = var.health_check_config.resource_path
  failure_threshold = var.health_check_config.failure_threshold
  request_interval  = var.health_check_config.request_interval
  measure_latency   = var.health_check_config.measure_latency
  regions          = var.health_check_config.regions

  tags = merge(
    var.tags,
    {
      Name        = "pcs-${var.environment}-api-health-check"
      Environment = var.environment
    }
  )
}

# DNS records for regional failover configuration
resource "aws_route53_record" "regional_endpoints" {
  for_each = { for idx, region in var.failover_regions : region.region => region }

  zone_id = aws_route53_zone.main.zone_id
  name    = "api-${each.key}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.api_gateway_domain
    zone_id               = var.api_gateway_zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = each.value.is_primary ? "PRIMARY" : "SECONDARY"
  }

  set {
    failover = each.value.is_primary ? "PRIMARY" : "SECONDARY"
    health_check_id = var.enable_health_check ? aws_route53_health_check.primary[0].id : null
  }
}

# SSL/TLS certificate validation records
resource "aws_route53_record" "cert_validation" {
  count = var.certificate_validation.method == "DNS" && var.certificate_validation.wait_for_validation ? 1 : 0

  zone_id = aws_route53_zone.main.zone_id
  name    = "_acme-challenge.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300

  records = [
    "validation.acm-validations.aws."
  ]
}

# Output the name servers for the hosted zone
output "name_servers" {
  value       = aws_route53_zone.main.name_servers
  description = "List of name servers for the hosted zone"
}

# Output the zone ID for reference
output "zone_id" {
  value       = aws_route53_zone.main.zone_id
  description = "The hosted zone ID"
}