package com.pcs.core.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.pcs.core.entities.Cargo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Positive;
import javax.validation.constraints.Size;
import java.time.LocalDateTime;

/**
 * Data Transfer Object for cargo manifest information in the Port Community System.
 * Provides comprehensive support for cargo data transfer, validation, and tracking.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CargoManifestDTO {

    private Long id;

    @NotNull(message = "Vessel call ID is required")
    private Long vesselCallId;

    @NotNull(message = "Cargo type is required")
    @Size(max = 50, message = "Cargo type cannot exceed 50 characters")
    private String cargoType;

    @NotNull(message = "Weight is required")
    @Positive(message = "Weight must be positive")
    private Double weight;

    @NotNull(message = "Volume is required")
    @Positive(message = "Volume must be positive")
    private Double volume;

    @NotNull(message = "Consignee ID is required")
    private Long consigneeId;

    @NotNull(message = "Status is required")
    @Size(max = 20, message = "Status cannot exceed 20 characters")
    private String status;

    @Size(max = 100, message = "Location cannot exceed 100 characters")
    private String location;

    @Size(max = 50, message = "Document reference cannot exceed 50 characters")
    private String documentReference;

    @Size(max = 20, message = "Customs status cannot exceed 20 characters")
    private String customsStatus;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    /**
     * Converts a Cargo entity to CargoManifestDTO with enhanced tracking data.
     *
     * @param cargo The cargo entity to convert
     * @return A fully populated CargoManifestDTO instance
     */
    public static CargoManifestDTO fromEntity(@Valid Cargo cargo) {
        return CargoManifestDTO.builder()
                .id(cargo.getId())
                .vesselCallId(cargo.getVesselCallId())
                .cargoType(cargo.getCargoType())
                .weight(cargo.getWeight())
                .volume(cargo.getVolume())
                .consigneeId(cargo.getConsigneeId())
                .status(cargo.getStatus())
                .location(cargo.getLocation())
                .documentReference(cargo.getDocumentReference())
                .customsStatus(cargo.getCustomsStatus())
                .createdAt(cargo.getCreatedAt())
                .updatedAt(cargo.getUpdatedAt())
                .build();
    }

    /**
     * Validates the cargo manifest data according to business rules.
     *
     * @return true if validation passes, false otherwise
     */
    public boolean validate() {
        return vesselCallId != null &&
                cargoType != null && !cargoType.isEmpty() &&
                weight != null && weight > 0 &&
                volume != null && volume > 0 &&
                consigneeId != null &&
                status != null && !status.isEmpty();
    }
}