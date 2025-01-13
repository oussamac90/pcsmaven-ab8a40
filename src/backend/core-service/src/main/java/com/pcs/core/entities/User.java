package com.pcs.core.entities;

import javax.persistence.Entity;
import javax.persistence.Table;
import javax.persistence.Id;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Column;
import javax.persistence.ManyToOne;
import javax.persistence.JoinColumn;
import javax.persistence.FetchType;
import javax.persistence.PrePersist;
import javax.persistence.PreUpdate;
import javax.persistence.Index;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import javax.validation.constraints.Email;
import javax.validation.constraints.Pattern;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.ToString;
import java.time.LocalDateTime;

/**
 * Entity class representing a user in the Port Community System.
 * Implements comprehensive security features including role-based access control
 * and maintains organizational hierarchy through company association.
 */
@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_user_company", columnList = "company_id"),
    @Index(name = "idx_user_email", columnList = "email", unique = true),
    @Index(name = "idx_user_username", columnList = "username", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"passwordHash"})
public class User {

    /**
     * Enumeration of possible user roles in the system
     */
    public enum UserRole {
        PORT_AUTHORITY,
        TERMINAL_OPERATOR,
        SHIPPING_LINE,
        CUSTOMS,
        FINANCE,
        SYSTEM_ADMIN
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Size(min = 3, max = 50)
    @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "Username can only contain alphanumeric characters, dots, underscores, and hyphens")
    @Column(nullable = false, unique = true)
    private String username;

    @NotNull
    @Email(message = "Must be a valid email address")
    @Size(max = 255)
    @Column(nullable = false, unique = true)
    private String email;

    @NotNull
    @Column(nullable = false, length = 60)  // Length of 60 for BCrypt hash
    private String passwordHash;

    @NotNull
    @Column(nullable = false)
    @Pattern(regexp = "^(PORT_AUTHORITY|TERMINAL_OPERATOR|SHIPPING_LINE|CUSTOMS|FINANCE|SYSTEM_ADMIN)$",
            message = "Invalid user role")
    private String role;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * JPA lifecycle method to set initial timestamps and status
     */
    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        this.active = true;
    }

    /**
     * JPA lifecycle method to update modification timestamp
     */
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}