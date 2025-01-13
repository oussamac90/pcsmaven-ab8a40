package com.pcs.core.controllers;

import com.pcs.core.entities.Vessel;
import com.pcs.core.services.VesselService;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.Link;
import org.slf4j.MDC;

import javax.validation.Valid;
import javax.validation.constraints.Pattern;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.time.LocalDateTime;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

/**
 * REST controller handling vessel-related endpoints in the Port Community System.
 * Provides APIs for vessel registration, queries, and management operations.
 */
@RestController
@RequestMapping("/api/v1/vessels")
@Slf4j
@Validated
public class VesselController {

    private final VesselService vesselService;

    public VesselController(VesselService vesselService) {
        this.vesselService = vesselService;
    }

    /**
     * Registers a new vessel with validation and HATEOAS links.
     *
     * @param vessel The vessel to register
     * @return ResponseEntity containing the registered vessel with HATEOAS links
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @CircuitBreaker(name = "vesselRegistration", fallbackMethod = "handleVesselRegistrationFailure")
    @TimeLimiter(name = "vesselRegistration")
    public CompletableFuture<ResponseEntity<EntityModel<Vessel>>> registerVessel(
            @Valid @RequestBody Vessel vessel) {
        return CompletableFuture.supplyAsync(() -> {
            MDC.put("operation", "registerVessel");
            MDC.put("imoNumber", vessel.getImoNumber());
            
            log.info("Received vessel registration request for IMO: {}", vessel.getImoNumber());
            
            LocalDateTime startTime = LocalDateTime.now();
            Vessel registeredVessel = vesselService.registerVessel(vessel);
            
            EntityModel<Vessel> vesselModel = EntityModel.of(registeredVessel);
            vesselModel.add(linkTo(methodOn(VesselController.class)
                    .getVesselByImo(registeredVessel.getImoNumber())).withSelfRel());
            vesselModel.add(linkTo(methodOn(VesselController.class)
                    .updateVessel(registeredVessel.getId(), null)).withRel("update"));
            
            log.info("Vessel registration completed in {} ms", 
                    LocalDateTime.now().minusNanos(startTime.getNano()).getNano() / 1_000_000);
            
            MDC.clear();
            return ResponseEntity.status(HttpStatus.CREATED).body(vesselModel);
        });
    }

    /**
     * Retrieves a vessel by IMO number with caching.
     *
     * @param imoNumber The IMO number to search for
     * @return ResponseEntity containing the found vessel
     */
    @GetMapping("/{imoNumber}")
    @Cacheable(value = "vesselCache", key = "#imoNumber")
    @CircuitBreaker(name = "vesselRetrieval", fallbackMethod = "handleVesselRetrievalFailure")
    public ResponseEntity<EntityModel<Vessel>> getVesselByImo(
            @PathVariable @Pattern(regexp = "IMO\\d{7}", message = "Invalid IMO number format") String imoNumber) {
        log.debug("Retrieving vessel with IMO: {}", imoNumber);
        
        Vessel vessel = vesselService.findVesselByImo(imoNumber);
        EntityModel<Vessel> vesselModel = EntityModel.of(vessel);
        vesselModel.add(linkTo(methodOn(VesselController.class)
                .getVesselByImo(imoNumber)).withSelfRel());
        
        return ResponseEntity.ok(vesselModel);
    }

    /**
     * Searches vessels by name pattern.
     *
     * @param name The vessel name pattern to search
     * @return List of matching vessels
     */
    @GetMapping("/search")
    @CircuitBreaker(name = "vesselSearch", fallbackMethod = "handleVesselSearchFailure")
    public ResponseEntity<List<Vessel>> searchVessels(
            @RequestParam(required = false) String name) {
        log.debug("Searching vessels with name pattern: {}", name);
        return ResponseEntity.ok(vesselService.searchVesselsByName(name));
    }

    /**
     * Retrieves vessels by flag country.
     *
     * @param flag The flag country to search for
     * @return List of vessels under specified flag
     */
    @GetMapping("/flag/{flag}")
    @Cacheable(value = "vesselFlagCache", key = "#flag")
    public ResponseEntity<List<Vessel>> getVesselsByFlag(@PathVariable String flag) {
        log.debug("Finding vessels by flag: {}", flag);
        return ResponseEntity.ok(vesselService.findVesselsByFlag(flag));
    }

    /**
     * Finds vessels by maximum draft requirement.
     *
     * @param maxDraft The maximum draft value
     * @return List of vessels meeting draft requirement
     */
    @GetMapping("/draft")
    public ResponseEntity<List<Vessel>> getVesselsByDraft(
            @RequestParam Double maxDraft) {
        log.debug("Finding vessels with max draft <= {}", maxDraft);
        return ResponseEntity.ok(vesselService.findVesselsByDraft(maxDraft));
    }

    /**
     * Updates vessel information with validation.
     *
     * @param id The vessel ID to update
     * @param vessel The updated vessel data
     * @return ResponseEntity containing updated vessel
     */
    @PutMapping("/{id}")
    @CircuitBreaker(name = "vesselUpdate", fallbackMethod = "handleVesselUpdateFailure")
    public ResponseEntity<EntityModel<Vessel>> updateVessel(
            @PathVariable Long id,
            @Valid @RequestBody Vessel vessel) {
        log.info("Updating vessel with ID: {}", id);
        
        Vessel updatedVessel = vesselService.updateVessel(id, vessel);
        EntityModel<Vessel> vesselModel = EntityModel.of(updatedVessel);
        vesselModel.add(linkTo(methodOn(VesselController.class)
                .getVesselByImo(updatedVessel.getImoNumber())).withSelfRel());
        
        return ResponseEntity.ok(vesselModel);
    }

    /**
     * Fallback method for vessel registration failures.
     */
    private CompletableFuture<ResponseEntity<EntityModel<Vessel>>> handleVesselRegistrationFailure(
            Vessel vessel, Throwable e) {
        log.error("Vessel registration failed for IMO: {}", vessel.getImoNumber(), e);
        return CompletableFuture.completedFuture(
                ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .build());
    }

    /**
     * Fallback method for vessel retrieval failures.
     */
    private ResponseEntity<EntityModel<Vessel>> handleVesselRetrievalFailure(
            String imoNumber, Throwable e) {
        log.error("Vessel retrieval failed for IMO: {}", imoNumber, e);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
    }

    /**
     * Fallback method for vessel search failures.
     */
    private ResponseEntity<List<Vessel>> handleVesselSearchFailure(
            String name, Throwable e) {
        log.error("Vessel search failed for name: {}", name, e);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
    }

    /**
     * Fallback method for vessel update failures.
     */
    private ResponseEntity<EntityModel<Vessel>> handleVesselUpdateFailure(
            Long id, Vessel vessel, Throwable e) {
        log.error("Vessel update failed for ID: {}", id, e);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
    }
}