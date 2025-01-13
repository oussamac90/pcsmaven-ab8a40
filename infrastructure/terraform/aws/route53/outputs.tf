# Output the Route53 hosted zone ID for cross-module reference
output "zone_id" {
  description = "The Route53 hosted zone ID for the Port Community System domain"
  value       = aws_route53_zone.main.zone_id
}

# Output the name servers for DNS delegation and configuration
output "zone_name_servers" {
  description = "List of name servers for the Route53 hosted zone"
  value       = aws_route53_zone.main.name_servers
}

# Output the API endpoint FQDN for service integration
output "api_dns_name" {
  description = "The DNS name for the API Gateway endpoint"
  value       = aws_route53_record.api.fqdn
}

# Output the health check ID for monitoring reference
output "health_check_id" {
  description = "The ID of the Route53 health check for DNS failover"
  value       = var.enable_health_check ? aws_route53_health_check.primary[0].id : null
}

# Output the web application domain name
output "web_dns_name" {
  description = "The DNS name for the web application"
  value       = aws_route53_record.web.fqdn
}

# Output regional endpoint FQDNs for failover configuration
output "regional_endpoints" {
  description = "Map of regional API endpoint FQDNs"
  value = {
    for region, record in aws_route53_record.regional_endpoints : 
    region => record.fqdn
  }
}

# Output certificate validation records if DNS validation is enabled
output "cert_validation_records" {
  description = "DNS records created for certificate validation"
  value = var.certificate_validation.method == "DNS" ? {
    name    = try(aws_route53_record.cert_validation[0].name, null)
    type    = try(aws_route53_record.cert_validation[0].type, null)
    records = try(aws_route53_record.cert_validation[0].records, [])
  } : null
}

# Output domain aliases for CDN and service discovery
output "domain_aliases" {
  description = "Map of domain aliases for the Port Community System"
  value = {
    api = aws_route53_record.api.name
    web = aws_route53_record.web.name
  }
}

# Output DNS failover configuration for monitoring
output "failover_config" {
  description = "DNS failover configuration details"
  value = {
    primary_region   = [for r in var.failover_regions : r.region if r.is_primary][0]
    backup_regions   = [for r in var.failover_regions : r.region if !r.is_primary]
    health_check_enabled = var.enable_health_check
  }
}