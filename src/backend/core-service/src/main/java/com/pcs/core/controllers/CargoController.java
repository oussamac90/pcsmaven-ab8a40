package com.pcs.core.controllers;

import com.pcs.core.services.CargoService;
import com.pcs.core.dto.CargoManifestDTO;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;

import javax.validation.Valid;
import java.util.List;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * REST controller for managing cargo operations in the Port Community System.
 * Provides endpoints for cargo manifest management, tracking, and status updates.
 * 
 * @version 1.0
 */
@RestController
@RequestMapping("/api/v1/cargo")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Cargo Operations", description = "APIs for cargo manifest management and tracking")
public class CargoController {

    private static final Logger logger = LoggerFactory.getLogger(CargoController.class);
    private final CargoService cargoService;
    private final CacheControl cacheControl;

    /**
     * Constructs CargoController with required dependencies.
     *
     * @param cargoService Service layer for cargo operations
     */
    @Autowired
    public CargoController(CargoService cargoService) {
        this.cargoService = cargoService;
        this.cacheControl = CacheControl.maxAge(10, TimeUnit.MINUTES)
                                      .noTransform()
                                      .mustRevalidate();
    }

    /**
     * Creates a new cargo manifest with enhanced validation.
     *
     * @param cargoManifestDTO Cargo manifest data
     * @return Created cargo manifest
     */
    @PostMapping
    @Operation(summary = "Create new cargo manifest", description = "Creates a new cargo manifest with EDIFACT validation")
    @RateLimiter(name = "cargoApi")
    @PreAuthorize("hasRole('CARGO_ADMIN')")
    public ResponseEntity<CargoManifestDTO> createCargoManifest(
            @Valid @RequestBody CargoManifestDTO cargoManifestDTO) {
        logger.info("Creating new cargo manifest for vessel call: {}", cargoManifestDTO.getVesselCallId());
        CargoManifestDTO createdManifest = cargoService.createCargoManifest(cargoManifestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdManifest);
    }

    /**
     * Retrieves cargo manifest by ID with caching support.
     *
     * @param id Cargo manifest ID
     * @return Cargo manifest details
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get cargo manifest", description = "Retrieves cargo manifest details by ID")
    @RateLimiter(name = "cargoApi")
    @PreAuthorize("hasAnyRole('CARGO_ADMIN', 'CARGO_VIEWER')")
    public ResponseEntity<CargoManifestDTO> getCargoManifest(@PathVariable Long id) {
        logger.info("Retrieving cargo manifest with ID: {}", id);
        return ResponseEntity.ok()
                           .cacheControl(cacheControl)
                           .body(cargoService.getCargoByDocumentReference(id.toString())
                                           .orElseThrow(() -> new ResourceNotFoundException("Cargo not found")));
    }

    /**
     * Updates cargo status with validation and tracking.
     *
     * @param id Cargo ID
     * @param status New status
     * @param customsStatus New customs status
     * @return Updated cargo manifest
     */
    @PutMapping("/{id}/status")
    @Operation(summary = "Update cargo status", description = "Updates cargo and customs status")
    @RateLimiter(name = "cargoApi")
    @PreAuthorize("hasRole('CARGO_ADMIN')")
    public ResponseEntity<CargoManifestDTO> updateCargoStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String customsStatus) {
        logger.info("Updating cargo status for ID: {}, status: {}, customs status: {}", 
                   id, status, customsStatus);
        return ResponseEntity.ok(cargoService.updateCargoStatus(id, status, customsStatus));
    }

    /**
     * Retrieves cargo manifests by vessel call with pagination.
     *
     * @param vesselCallId Vessel call ID
     * @return List of cargo manifests
     */
    @GetMapping("/vessel/{vesselCallId}")
    @Operation(summary = "Get cargo by vessel", description = "Retrieves cargo manifests for a vessel call")
    @RateLimiter(name = "cargoApi")
    @PreAuthorize("hasAnyRole('CARGO_ADMIN', 'CARGO_VIEWER')")
    public ResponseEntity<List<CargoManifestDTO>> getCargoByVesselCall(
            @PathVariable Long vesselCallId) {
        logger.info("Retrieving cargo manifests for vessel call: {}", vesselCallId);
        return ResponseEntity.ok()
                           .cacheControl(cacheControl)
                           .body(cargoService.getCargoByVesselCall(vesselCallId));
    }

    /**
     * Retrieves cargo manifests by status with pagination and filtering.
     *
     * @param status Cargo status
     * @param customsStatus Customs status
     * @param pageable Pagination parameters
     * @return Page of cargo manifests
     */
    @GetMapping("/status")
    @Operation(summary = "Get cargo by status", description = "Retrieves paginated cargo manifests by status")
    @RateLimiter(name = "cargoApi")
    @PreAuthorize("hasAnyRole('CARGO_ADMIN', 'CARGO_VIEWER')")
    public ResponseEntity<Page<CargoManifestDTO>> getCargoByStatus(
            @RequestParam String status,
            @RequestParam(required = false) String customsStatus,
            Pageable pageable) {
        logger.info("Retrieving cargo manifests by status: {}, customs status: {}", status, customsStatus);
        return ResponseEntity.ok()
                           .cacheControl(cacheControl)
                           .body(cargoService.getCargoByStatus(status, customsStatus, pageable));
    }
}

/**
 * Custom exception for resource not found scenarios.
 */
class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}