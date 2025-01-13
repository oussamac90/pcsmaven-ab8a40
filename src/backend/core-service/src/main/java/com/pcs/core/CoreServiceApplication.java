package com.pcs.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.core.task.TaskExecutor;
import org.springframework.boot.web.servlet.ServletComponentScan;
import org.springframework.boot.actuate.autoconfigure.metrics.MeterRegistryCustomizer;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;

import java.util.concurrent.Executor;
import java.util.Arrays;

/**
 * Main application class for the Port Community System core service.
 * Implements comprehensive configuration for high-performance vessel management,
 * cargo tracking, berth operations, and document exchange.
 */
@SpringBootApplication(scanBasePackages = "com.pcs.core")
@EnableAsync(proxyTargetClass = true)
@EnableScheduling
@ServletComponentScan
public class CoreServiceApplication {

    private static final int CORE_POOL_SIZE = 10;
    private static final int MAX_POOL_SIZE = 50;
    private static final int QUEUE_CAPACITY = 100;
    private static final String THREAD_NAME_PREFIX = "pcs-async-";

    /**
     * Main method to bootstrap the Port Community System core service
     * @param args Command line arguments
     */
    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(CoreServiceApplication.class);
        
        // Configure application properties
        app.setDefaultProperties(java.util.Collections.singletonMap(
            "spring.profiles.default", "production"
        ));
        
        // Start the application with enhanced error handling
        try {
            app.run(args);
        } catch (Exception e) {
            System.err.println("Failed to start Port Community System core service: " + e.getMessage());
            System.exit(1);
        }
    }

    /**
     * Configures async task executor for high-performance concurrent operations
     * @return Configured ThreadPoolTaskExecutor
     */
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(CORE_POOL_SIZE);
        executor.setMaxPoolSize(MAX_POOL_SIZE);
        executor.setQueueCapacity(QUEUE_CAPACITY);
        executor.setThreadNamePrefix(THREAD_NAME_PREFIX);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    /**
     * Configures scheduled task executor for automated operations
     * @return Configured ThreadPoolTaskExecutor
     */
    @Bean(name = "scheduledTaskExecutor")
    public TaskExecutor scheduledTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(25);
        executor.setThreadNamePrefix("pcs-scheduled-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.initialize();
        return executor;
    }

    /**
     * Customizes metrics registry with port-specific tags
     * @return MeterRegistryCustomizer for metrics configuration
     */
    @Bean
    public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags() {
        return registry -> registry.config()
            .commonTags(Arrays.asList(
                Tag.of("application", "pcs-core"),
                Tag.of("environment", "${spring.profiles.active:production}")
            ));
    }
}