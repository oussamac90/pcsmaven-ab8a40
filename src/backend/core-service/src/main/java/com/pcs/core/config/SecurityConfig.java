package com.pcs.core.config;

import com.pcs.core.entities.User;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.security.SecurityProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.preauth.x509.X509AuthenticationFilter;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.web.session.SessionManagementFilter;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.http.HttpMethod;

import java.util.Arrays;
import java.util.Collections;

/**
 * Comprehensive security configuration for the Port Community System
 * Implements multi-layer authentication and authorization mechanisms
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final SecurityProperties securityProperties;
    private static final String[] ALLOWED_ORIGINS = {
        "https://pcs.port.com",
        "https://terminal.port.com",
        "https://customs.port.com"
    };
    private static final int MAX_SESSIONS = 1;

    /**
     * Configures the main security filter chain with multiple authentication layers
     */
    @Bean
    @Order(1)
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            // CSRF Protection
            .csrf(csrf -> csrf
                .csrfTokenRepository(csrfTokenRepository())
                .ignoringAntMatchers("/api/v1/edifact/**", "/api/v1/vessel-tracking/**"))

            // CORS Configuration
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Session Management
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                .maximumSessions(MAX_SESSIONS)
                .maxSessionsPreventsLogin(true))

            // X.509 Certificate Authentication for System Integration
            .addFilterBefore(new X509AuthenticationFilter(), SessionManagementFilter.class)

            // JWT Token Authentication
            .addFilterBefore(new BearerTokenAuthenticationFilter(), X509AuthenticationFilter.class)

            // OAuth2 Resource Server Configuration
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())))

            // Role-Based Authorization Rules
            .authorizeRequests(authorize -> authorize
                // Public endpoints
                .antMatchers("/api/v1/public/**").permitAll()
                .antMatchers("/actuator/health").permitAll()
                
                // Vessel Operations
                .antMatchers("/api/v1/vessels/**").hasAnyRole(
                    User.UserRole.PORT_AUTHORITY.name(),
                    User.UserRole.TERMINAL_OPERATOR.name(),
                    User.UserRole.SHIPPING_LINE.name())
                
                // Document Management
                .antMatchers("/api/v1/documents/**").hasAnyRole(
                    User.UserRole.PORT_AUTHORITY.name(),
                    User.UserRole.CUSTOMS.name(),
                    User.UserRole.SHIPPING_LINE.name())
                
                // Financial Operations
                .antMatchers("/api/v1/finance/**").hasRole(User.UserRole.FINANCE.name())
                
                // Admin Operations
                .antMatchers("/api/v1/admin/**").hasRole(User.UserRole.SYSTEM_ADMIN.name())
                
                // Default deny all
                .anyRequest().authenticated())

            // Security Headers
            .headers(headers -> headers
                .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)
                .xssProtection(HeadersConfigurer.XXssConfig::enable)
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'; frame-ancestors 'none';")))

            // DDoS Protection
            .requiresChannel(channel -> channel
                .anyRequest().requiresSecure())

            .build();
    }

    /**
     * Configures password encoder with high strength for secure password storage
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    /**
     * Configures CORS with maritime-specific settings
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(ALLOWED_ORIGINS));
        configuration.setAllowedMethods(Arrays.asList(
            HttpMethod.GET.name(),
            HttpMethod.POST.name(),
            HttpMethod.PUT.name(),
            HttpMethod.DELETE.name(),
            HttpMethod.OPTIONS.name()
        ));
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "X-XSRF-TOKEN",
            "X-Client-Certificate",
            "X-Maritime-Token"
        ));
        configuration.setExposedHeaders(Arrays.asList(
            "X-Maritime-Token",
            "X-Rate-Limit-Remaining"
        ));
        configuration.setMaxAge(3600L);
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    /**
     * Configures CSRF token repository
     */
    private CsrfTokenRepository csrfTokenRepository() {
        HttpSessionCsrfTokenRepository repository = new HttpSessionCsrfTokenRepository();
        repository.setHeaderName("X-XSRF-TOKEN");
        return repository;
    }

    /**
     * Converts JWT claims to Spring Security authorities
     */
    private Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            List<String> roles = jwt.getClaimAsStringList("roles");
            return roles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .collect(Collectors.toList());
        });
        return converter;
    }
}