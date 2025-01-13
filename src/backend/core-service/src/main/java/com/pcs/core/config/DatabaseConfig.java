package com.pcs.core.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;

import java.util.Properties;

/**
 * Enhanced database configuration class for Port Community System core service.
 * Implements high-performance PostgreSQL configuration with optimized connection pooling,
 * monitoring capabilities and enhanced security features.
 */
@Configuration
@EnableJpaRepositories(basePackages = "com.pcs.core")
@ConfigurationProperties(prefix = "spring.datasource")
public class DatabaseConfig {

    private String url;
    private String username;
    private String password;
    private String driverClassName;
    private Integer maxPoolSize = 50;
    private Integer minIdle = 10;
    private Long connectionTimeout = 30000L;
    private Long idleTimeout = 600000L;
    private Long maxLifetime = 1800000L;

    private final MeterRegistry meterRegistry;

    public DatabaseConfig(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    /**
     * Creates and configures an optimized HikariCP datasource for high-performance database connections.
     * Implements enhanced connection pooling settings to support 1000+ concurrent users.
     */
    @Bean
    public HikariDataSource dataSource() {
        HikariConfig config = new HikariConfig();
        
        // Core database connection settings
        config.setJdbcUrl(url);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName(driverClassName);

        // Enhanced connection pool settings
        config.setMaximumPoolSize(maxPoolSize);
        config.setMinimumIdle(minIdle);
        config.setConnectionTimeout(connectionTimeout);
        config.setIdleTimeout(idleTimeout);
        config.setMaxLifetime(maxLifetime);
        
        // Performance optimizations
        config.setAutoCommit(false);
        config.addDataSourceProperty("cachePrepStmts", "true");
        config.addDataSourceProperty("prepStmtCacheSize", "250");
        config.addDataSourceProperty("prepStmtCacheSqlLimit", "2048");
        config.addDataSourceProperty("useServerPrepStmts", "true");
        
        // Connection validation
        config.setConnectionTestQuery("SELECT 1");
        config.setValidationTimeout(5000);
        
        // Leak detection
        config.setLeakDetectionThreshold(60000);
        
        // Metrics integration
        config.setMetricRegistry(meterRegistry);
        
        return new HikariDataSource(config);
    }

    /**
     * Configures the JPA entity manager factory with optimized Hibernate properties
     * for high-performance database operations.
     */
    @Bean
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(HikariDataSource dataSource) {
        LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(dataSource);
        factory.setPackagesToScan("com.pcs.core");
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setJpaProperties(getHibernateProperties());
        
        return factory;
    }

    /**
     * Creates optimized Hibernate properties for high-performance JPA configuration.
     * Includes settings for caching, batching, and query optimization.
     */
    private Properties getHibernateProperties() {
        Properties props = new Properties();
        
        // Dialect configuration
        props.setProperty("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
        
        // Performance optimizations
        props.setProperty("hibernate.jdbc.batch_size", "50");
        props.setProperty("hibernate.jdbc.fetch_size", "100");
        props.setProperty("hibernate.jdbc.batch_versioned_data", "true");
        props.setProperty("hibernate.order_inserts", "true");
        props.setProperty("hibernate.order_updates", "true");
        
        // Caching configuration
        props.setProperty("hibernate.cache.use_query_cache", "true");
        props.setProperty("hibernate.cache.use_second_level_cache", "true");
        props.setProperty("hibernate.cache.region.factory_class", 
                "org.hibernate.cache.ehcache.EhCacheRegionFactory");
        
        // Statement caching
        props.setProperty("hibernate.cache.use_structured_entries", "true");
        
        // Statistics and monitoring
        props.setProperty("hibernate.generate_statistics", "true");
        props.setProperty("hibernate.session.events.log", "true");
        
        // Transaction management
        props.setProperty("hibernate.connection.release_mode", "after_transaction");
        props.setProperty("hibernate.transaction.jta.platform", 
                "org.hibernate.engine.transaction.jta.platform.internal.NoJtaPlatform");
        
        return props;
    }

    // Getters and setters for configuration properties
    public void setUrl(String url) {
        this.url = url;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setDriverClassName(String driverClassName) {
        this.driverClassName = driverClassName;
    }

    public void setMaxPoolSize(Integer maxPoolSize) {
        this.maxPoolSize = maxPoolSize;
    }

    public void setMinIdle(Integer minIdle) {
        this.minIdle = minIdle;
    }

    public void setConnectionTimeout(Long connectionTimeout) {
        this.connectionTimeout = connectionTimeout;
    }

    public void setIdleTimeout(Long idleTimeout) {
        this.idleTimeout = idleTimeout;
    }

    public void setMaxLifetime(Long maxLifetime) {
        this.maxLifetime = maxLifetime;
    }
}