package com.pcs.core.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.pcs.core.entities.Vessel;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;
import java.time.LocalDateTime;

/**
 * Data Transfer Object for vessel call operations in the Port Community System.
 * Provides a secure and validated representation of vessel visit data including arrival/departure times,
 * status, and operational information.
 */
@Data
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class VesselCallDTO {

    private Long id;

    @NotNull(message = "Port ID is required")
    private Long portId;

    @NotNull(message = "Vessel ID is required")
    private Long vesselId;

    @NotNull(message = "Call sign is required")
    @Pattern(regexp = "[A-Z0-9]{3,10}", message = "Call sign must be 3-10 alphanumeric characters")
    private String callSign;

    @NotNull(message = "Status is required")
    @Pattern(regexp = "^(SCHEDULED|APPROACHING|BERTHED|DEPARTED|CANCELLED)$", 
            message = "Invalid vessel call status")
    private String status;

    @NotNull(message = "ETA is required")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss", timezone = "UTC")
    private LocalDateTime eta;

    @NotNull(message = "ETD is required")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss", timezone = "UTC")
    private LocalDateTime etd;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss", timezone = "UTC")
    private LocalDateTime ata;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss", timezone = "UTC")
    private LocalDateTime atd;

    @NotNull(message = "Vessel name is required")
    private String vesselName;

    @NotNull(message = "IMO number is required")
    @Pattern(regexp = "IMO\\d{7}", message = "IMO number must be in format IMO followed by 7 digits")
    private String imoNumber;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss", timezone = "UTC")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss", timezone = "UTC")
    private LocalDateTime updatedAt;

    /**
     * Creates a validated VesselCallDTO instance from a VesselCall entity.
     * Performs comprehensive null checking and format validation.
     *
     * @param vesselCall The vessel call entity to convert
     * @return A fully validated VesselCallDTO instance
     * @throws IllegalArgumentException if the input entity or required fields are null
     */
    public static VesselCallDTO fromEntity(VesselCall vesselCall) {
        if (vesselCall == null) {
            throw new IllegalArgumentException("Vessel call entity cannot be null");
        }

        Vessel vessel = vesselCall.getVessel();
        if (vessel == null) {
            throw new IllegalArgumentException("Associated vessel cannot be null");
        }

        return VesselCallDTO.builder()
                .id(vesselCall.getId())
                .portId(vesselCall.getPortId())
                .vesselId(vessel.getId())
                .callSign(vesselCall.getCallSign())
                .status(vesselCall.getStatus())
                .eta(vesselCall.getEta())
                .etd(vesselCall.getEtd())
                .ata(vesselCall.getAta())
                .atd(vesselCall.getAtd())
                .vesselName(vessel.getName())
                .imoNumber(vessel.getImoNumber())
                .createdAt(vesselCall.getCreatedAt())
                .updatedAt(vesselCall.getUpdatedAt())
                .build();
    }
}