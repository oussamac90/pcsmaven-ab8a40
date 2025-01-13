package com.pcs.core.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;

/**
 * Data Transfer Object for managing berth allocation requests in the Port Community System.
 * This class facilitates the transfer of berth request data between the API layer and core service layer,
 * incorporating comprehensive vessel details and scheduling information.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BerthRequestDTO {

    /**
     * Unique identifier for the vessel call associated with this berth request
     */
    @NotNull(message = "Vessel call ID is required")
    @JsonProperty("vessel_call_id")
    private Long vesselCallId;

    /**
     * Identifier for the requested berth
     */
    @NotNull(message = "Berth ID is required")
    @JsonProperty("berth_id")
    private Long berthId;

    /**
     * Requested start time for berth allocation
     */
    @NotNull(message = "Requested start time is required")
    @JsonProperty("requested_start_time")
    private LocalDateTime requestedStartTime;

    /**
     * Requested end time for berth allocation
     */
    @NotNull(message = "Requested end time is required")
    @JsonProperty("requested_end_time")
    private LocalDateTime requestedEndTime;

    /**
     * Name of the vessel requesting berth allocation
     */
    @NotNull(message = "Vessel name is required")
    @JsonProperty("vessel_name")
    private String vesselName;

    /**
     * IMO number of the vessel
     */
    @NotNull(message = "Vessel IMO number is required")
    @JsonProperty("vessel_imo")
    private String vesselImo;

    /**
     * Length of the vessel in meters
     */
    @NotNull(message = "Vessel length is required")
    @JsonProperty("vessel_length")
    private Double vesselLength;

    /**
     * Draft of the vessel in meters
     */
    @NotNull(message = "Vessel draft is required")
    @JsonProperty("vessel_draft")
    private Double vesselDraft;

    /**
     * Type of cargo to be handled during berth allocation
     */
    @NotNull(message = "Cargo type is required")
    @JsonProperty("cargo_type")
    private String cargoType;

    /**
     * Current status of the berth request
     * Possible values: PENDING, APPROVED, REJECTED, COMPLETED
     */
    @JsonProperty("status")
    private String status;
}