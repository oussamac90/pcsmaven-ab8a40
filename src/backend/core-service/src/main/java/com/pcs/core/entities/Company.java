package com.pcs.core.entities;

import javax.persistence.Entity;
import javax.persistence.Table;
import javax.persistence.Id;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Column;
import javax.persistence.Enumerated;
import javax.persistence.EnumType;
import javax.persistence.PrePersist;
import javax.persistence.PreUpdate;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import javax.validation.constraints.Email;
import javax.validation.constraints.Pattern;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * Entity class representing a company in the Port Community System.
 * Companies can be terminal operators, shipping lines, customs authorities,
 * freight forwarders, or port authorities. Each company has users and can
 * own vessels or cargo.
 */
@Entity
@Table(name = "companies")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Company {

    /**
     * Enumeration of possible company types in the port community system
     */
    public enum CompanyType {
        PORT_AUTHORITY,
        TERMINAL_OPERATOR,
        SHIPPING_LINE,
        CUSTOMS,
        FREIGHT_FORWARDER,
        FINANCE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Size(max = 255)
    @Column(nullable = false)
    private String name;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CompanyType type;

    @NotNull
    @Size(max = 50)
    @Column(nullable = false, unique = true)
    private String registrationNumber;

    @Size(max = 50)
    @Column(unique = true)
    private String vatNumber;

    @NotNull
    @Size(max = 500)
    @Column(nullable = false)
    private String address;

    @NotNull
    @Pattern(regexp = "^\\+?[1-9][0-9]{7,14}$")
    @Column(name = "contact_number", nullable = false)
    private String contactNumber;

    @NotNull
    @Email
    @Size(max = 255)
    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * JPA lifecycle method to set creation timestamp and default values
     */
    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        this.active = true;
    }

    /**
     * JPA lifecycle method to update timestamp
     */
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}