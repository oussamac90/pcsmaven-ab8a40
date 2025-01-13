# Redis Cluster Configuration Output
output "redis_cluster" {
  description = "Redis cluster configuration and connection information for high-availability caching"
  value = {
    id                    = aws_elasticache_replication_group.redis.id
    primary_endpoint      = aws_elasticache_replication_group.redis.primary_endpoint_address
    reader_endpoint       = aws_elasticache_replication_group.redis.reader_endpoint_address
    configuration_endpoint = aws_elasticache_replication_group.redis.configuration_endpoint_address
    port                 = aws_elasticache_replication_group.redis.port
    cluster_mode = {
      enabled    = aws_elasticache_replication_group.redis.automatic_failover_enabled
      num_nodes  = aws_elasticache_replication_group.redis.number_cache_clusters
    }
    parameter_group = {
      id      = aws_elasticache_parameter_group.redis.id
      name    = aws_elasticache_parameter_group.redis.name
      family  = aws_elasticache_parameter_group.redis.family
    }
  }
  sensitive = false
}

# Redis Connection String Output
output "redis_connection_string" {
  description = "Formatted Redis connection string for application configuration"
  value       = format("redis://%s:%s", 
    aws_elasticache_replication_group.redis.primary_endpoint_address,
    aws_elasticache_replication_group.redis.port
  )
  sensitive = false
}

# Redis Reader Connection String Output
output "redis_reader_connection_string" {
  description = "Formatted Redis reader endpoint connection string for read-heavy operations"
  value       = format("redis://%s:%s",
    aws_elasticache_replication_group.redis.reader_endpoint_address,
    aws_elasticache_replication_group.redis.port
  )
  sensitive = false
}