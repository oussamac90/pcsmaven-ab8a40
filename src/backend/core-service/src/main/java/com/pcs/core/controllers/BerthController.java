package com.pcs.core.controllers;

import com.pcs.core.dto.BerthRequestDTO;
import com.pcs.core.entities.Berth;
import com.pcs.core.services.BerthService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.micrometer.core.annotation.Timed;
import io.micrometer.core.instrument.MeterRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * REST controller for managing berth operations in the Port Community System.
 * Provides endpoints for berth allocation, availability checks, and status management.
 */
@RestController
@RequestMapping("/api/v1/berths")
@Validated
@Tag(name = "Berth Management", description = "APIs for berth operations and allocation management")
@Slf4j
public class BerthController {

    private final BerthService berthService;
    private final MeterRegistry meterRegistry;

    public BerthController(BerthService berthService, MeterRegistry meterRegistry) {
        this.berthService = berthService;
        this.meterRegistry = meterRegistry;
        // Register custom metrics
        this.meterRegistry.gauge("berth.requests.active", 0);
    }

    /**
     * Retrieves all berths for a specific port with caching support.
     *
     * @param portId ID of the port
     * @return List of berths in the specified port
     */
    @GetMapping("/port/{portId}")
    @Operation(summary = "Get berths by port",
            description = "Retrieves all berths for a specific port with their current status")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved berths")
    @Cacheable(value = "berthsByPort", key = "#portId")
    @Timed(value = "berth.get.port", description = "Time taken to retrieve berths by port")
    @RateLimiter(name = "berthAPI")
    public ResponseEntity<List<Berth>> getBerthsByPort(
            @Parameter(description = "ID of the port", required = true)
            @PathVariable @NotNull Long portId) {
        log.debug("REST request to get berths for port ID: {}", portId);
        return ResponseEntity.ok(berthService.getAllBerthsByPort(portId));
    }

    /**
     * Checks availability of a specific berth for the requested time period.
     *
     * @param berthId ID of the berth
     * @param request Berth request details
     * @return Availability status of the berth
     */
    @PostMapping("/{berthId}/check-availability")
    @Operation(summary = "Check berth availability",
            description = "Checks if a berth is available for the requested time slot")
    @Timed(value = "berth.check.availability")
    @RateLimiter(name = "berthAPI")
    public ResponseEntity<Boolean> checkBerthAvailability(
            @Parameter(description = "ID of the berth", required = true)
            @PathVariable @NotNull Long berthId,
            @Parameter(description = "Berth request details", required = true)
            @Valid @RequestBody BerthRequestDTO request) {
        log.debug("REST request to check availability for berth ID: {}", berthId);
        return ResponseEntity.ok(berthService.checkBerthAvailability(berthId, request));
    }

    /**
     * Processes a berth allocation request with validation and monitoring.
     *
     * @param request Berth allocation request details
     * @return Details of the allocated berth
     */
    @PostMapping("/allocate")
    @Operation(summary = "Allocate berth",
            description = "Processes a berth allocation request with comprehensive validation")
    @ApiResponse(responseCode = "201", description = "Berth successfully allocated")
    @Timed(value = "berth.allocate")
    @RateLimiter(name = "berthAPI")
    public ResponseEntity<Berth> allocateBerth(
            @Parameter(description = "Berth allocation request details", required = true)
            @Valid @RequestBody BerthRequestDTO request) {
        log.info("REST request to allocate berth for vessel call ID: {}", request.getVesselCallId());
        meterRegistry.counter("berth.allocation.requests").increment();
        
        Berth allocatedBerth = berthService.allocateBerth(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(allocatedBerth);
    }

    /**
     * Updates the status of a berth with validation.
     *
     * @param berthId ID of the berth
     * @param status New status to set
     * @return Updated berth details
     */
    @PutMapping("/{berthId}/status")
    @Operation(summary = "Update berth status",
            description = "Updates the operational status of a berth")
    @Timed(value = "berth.update.status")
    @RateLimiter(name = "berthAPI")
    public ResponseEntity<Berth> updateBerthStatus(
            @Parameter(description = "ID of the berth", required = true)
            @PathVariable @NotNull Long berthId,
            @Parameter(description = "New berth status", required = true)
            @RequestParam @NotNull String status) {
        log.debug("REST request to update status of berth ID: {} to {}", berthId, status);
        return ResponseEntity.ok(berthService.updateBerthStatus(berthId, status));
    }

    /**
     * Retrieves berths that meet specific vessel requirements.
     *
     * @param minLength Minimum required berth length
     * @param minDepth Minimum required berth depth
     * @return List of suitable berths
     */
    @GetMapping("/suitable")
    @Operation(summary = "Find suitable berths",
            description = "Finds berths that meet specific vessel requirements")
    @Cacheable(value = "suitableBerths", key = "#minLength + '_' + #minDepth")
    @Timed(value = "berth.get.suitable")
    @RateLimiter(name = "berthAPI")
    public ResponseEntity<List<Berth>> getSuitableBerths(
            @Parameter(description = "Minimum required berth length", required = true)
            @RequestParam @NotNull Double minLength,
            @Parameter(description = "Minimum required berth depth", required = true)
            @RequestParam @NotNull Double minDepth) {
        log.debug("REST request to find suitable berths with length >= {} and depth >= {}", 
                minLength, minDepth);
        return ResponseEntity.ok(berthService.findSuitableBerths(minLength, minDepth));
    }
}