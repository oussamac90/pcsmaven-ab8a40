package com.pcs.core.entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import javax.validation.constraints.DecimalMin;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import java.time.LocalDateTime;

/**
 * Entity class representing a berth in the port community system.
 * A berth is a designated location along a quay where vessels can dock for loading and unloading operations.
 * This class tracks physical characteristics, operational status, and allocation details of berths.
 */
@Entity
@Table(name = "berths", indexes = {
    @Index(name = "idx_port_id", columnList = "port_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Berth {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Port ID is required")
    @Column(name = "port_id", nullable = false)
    private Long portId;

    @NotNull(message = "Berth name is required")
    @Size(min = 1, max = 50, message = "Berth name must be between 1 and 50 characters")
    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @NotNull(message = "Berth length is required")
    @DecimalMin(value = "0.0", message = "Length must be greater than 0")
    @Column(name = "length", nullable = false)
    private Double length;

    @NotNull(message = "Berth depth is required")
    @DecimalMin(value = "0.0", message = "Depth must be greater than 0")
    @Column(name = "depth", nullable = false)
    private Double depth;

    @NotNull(message = "Maximum vessel size is required")
    @Size(max = 50, message = "Maximum vessel size must not exceed 50 characters")
    @Column(name = "max_vessel_size", nullable = false, length = 50)
    private String maxVesselSize;

    @NotNull(message = "Status is required")
    @Size(max = 20, message = "Status must not exceed 20 characters")
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Sets initial timestamps before entity persistence
     */
    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    /**
     * Updates the last modified timestamp before entity update
     */
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}