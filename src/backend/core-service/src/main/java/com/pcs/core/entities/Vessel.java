package com.pcs.core.entities;

import javax.persistence.*;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Entity class representing a vessel in the Port Community System.
 * Contains comprehensive vessel information including identification, dimensions,
 * registration details and operational characteristics.
 */
@Entity
@Table(name = "vessels", indexes = {
    @Index(name = "idx_imo_number", columnList = "imo_number", unique = true),
    @Index(name = "idx_vessel_name", columnList = "name")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Vessel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Pattern(regexp = "IMO\\d{7}", message = "IMO number must be in format IMO followed by 7 digits")
    @Column(name = "imo_number", nullable = false, unique = true, length = 10)
    private String imoNumber;

    @NotNull
    @Size(min = 2, max = 100)
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @NotNull
    @Size(max = 50)
    @Column(name = "type", nullable = false, length = 50)
    private String type;

    @NotNull
    @Size(max = 50)
    @Column(name = "flag", nullable = false, length = 50)
    private String flag;

    @NotNull
    @Column(name = "length", nullable = false)
    private Double length;

    @NotNull
    @Column(name = "width", nullable = false)
    private Double width;

    @NotNull
    @Column(name = "max_draft", nullable = false)
    private Double maxDraft;

    @Column(name = "vessel_capacity")
    private Double vesselCapacity;

    @NotNull
    @Size(max = 100)
    @Column(name = "owner", nullable = false, length = 100)
    private String owner;

    @Size(max = 100)
    @Column(name = "registration_port", length = 100)
    private String registrationPort;

    @Size(max = 100)
    @Column(name = "classification_society", length = 100)
    private String classificationSociety;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "vessel", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<VesselCall> vesselCalls = new HashSet<>();

    /**
     * JPA callback method executed before persisting the entity.
     * Initializes audit timestamps and ensures vesselCalls collection is initialized.
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (vesselCalls == null) {
            vesselCalls = new HashSet<>();
        }
    }

    /**
     * JPA callback method executed before updating the entity.
     * Updates the last modified timestamp.
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}