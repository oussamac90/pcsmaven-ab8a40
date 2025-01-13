package com.pcs.core.entities;

import javax.persistence.Entity;
import javax.persistence.Table;
import javax.persistence.Id;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Column;
import javax.persistence.PrePersist;
import javax.persistence.PreUpdate;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * JPA entity representing cargo manifest data in the Port Community System.
 * Manages comprehensive cargo information including type, weight, volume,
 * tracking status, and document references.
 */
@Entity
@Table(name = "cargo")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Cargo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false, updatable = false)
    private Long id;

    @Column(name = "vessel_call_id", nullable = false)
    private Long vesselCallId;

    @Column(name = "cargo_type", nullable = false, length = 50)
    private String cargoType;

    @Column(name = "weight", precision = 10, scale = 2)
    private Double weight;

    @Column(name = "volume", precision = 10, scale = 2)
    private Double volume;

    @Column(name = "consignee_id", nullable = false)
    private Long consigneeId;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "location", length = 100)
    private String location;

    @Column(name = "document_reference", length = 50)
    private String documentReference;

    @Column(name = "customs_status", length = 20)
    private String customsStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * JPA lifecycle callback executed before entity persistence.
     * Initializes creation and update timestamps.
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    /**
     * JPA lifecycle callback executed before entity update.
     * Updates the last modified timestamp.
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}