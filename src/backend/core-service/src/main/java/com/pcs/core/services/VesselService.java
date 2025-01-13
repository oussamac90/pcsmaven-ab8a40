package com.pcs.core.services;

import com.pcs.core.entities.Vessel;
import com.pcs.core.repositories.VesselRepository;
import com.pcs.core.events.VesselRegisteredEvent;
import com.pcs.core.events.VesselUpdatedEvent;
import com.pcs.core.exceptions.VesselNotFoundException;
import com.pcs.core.exceptions.DuplicateVesselException;
import com.pcs.core.integration.TOSIntegrationService;
import com.pcs.core.metrics.MetricService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.CacheConfig;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.ApplicationEventPublisher;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.extern.slf4j.Slf4j;

import javax.validation.Valid;
import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

/**
 * Service class implementing vessel management business logic in the Port Community System.
 * Handles vessel registration, queries, operations, real-time tracking, and integration with external systems.
 */
@Service
@Transactional
@Slf4j
@CacheConfig(cacheNames = "vessels")
public class VesselService {

    private final VesselRepository vesselRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final TOSIntegrationService tosIntegrationService;
    private final MetricService metricService;

    public VesselService(VesselRepository vesselRepository,
                        ApplicationEventPublisher eventPublisher,
                        TOSIntegrationService tosIntegrationService,
                        MetricService metricService) {
        this.vesselRepository = vesselRepository;
        this.eventPublisher = eventPublisher;
        this.tosIntegrationService = tosIntegrationService;
        this.metricService = metricService;
    }

    /**
     * Registers a new vessel with validation and real-time notification.
     *
     * @param vessel The vessel entity to register
     * @return The registered vessel
     * @throws DuplicateVesselException if vessel with IMO number already exists
     */
    @Transactional
    @CacheEvict(allEntries = true)
    public Vessel registerVessel(@Valid Vessel vessel) {
        log.info("Registering new vessel with IMO number: {}", vessel.getImoNumber());
        
        if (vesselRepository.existsByImoNumber(vessel.getImoNumber())) {
            throw new DuplicateVesselException("Vessel with IMO number " + vessel.getImoNumber() + " already exists");
        }

        vessel.setCreatedAt(LocalDateTime.now());
        vessel.setUpdatedAt(LocalDateTime.now());

        Vessel savedVessel = vesselRepository.save(vessel);
        
        // Publish event for real-time updates
        eventPublisher.publishEvent(new VesselRegisteredEvent(savedVessel));
        
        // Integrate with TOS
        notifyTOSAboutNewVessel(savedVessel);
        
        metricService.recordVesselRegistration();
        
        log.info("Successfully registered vessel: {}", savedVessel.getName());
        return savedVessel;
    }

    /**
     * Retrieves a vessel by IMO number with caching.
     *
     * @param imoNumber The IMO number to search for
     * @return The found vessel
     * @throws VesselNotFoundException if vessel not found
     */
    @Transactional(readOnly = true)
    @Cacheable(key = "#imoNumber")
    public Vessel findVesselByImo(String imoNumber) {
        log.debug("Searching for vessel with IMO number: {}", imoNumber);
        return vesselRepository.findByImoNumber(imoNumber)
            .orElseThrow(() -> new VesselNotFoundException("Vessel not found with IMO: " + imoNumber));
    }

    /**
     * Searches vessels by name pattern.
     *
     * @param name The vessel name pattern to search
     * @return List of matching vessels
     */
    @Transactional(readOnly = true)
    public List<Vessel> searchVesselsByName(String name) {
        log.debug("Searching vessels by name pattern: {}", name);
        return vesselRepository.findByName(name);
    }

    /**
     * Finds vessels by flag country.
     *
     * @param flag The flag country to search for
     * @return List of vessels under specified flag
     */
    @Transactional(readOnly = true)
    public List<Vessel> findVesselsByFlag(String flag) {
        log.debug("Finding vessels by flag: {}", flag);
        return vesselRepository.findByFlag(flag);
    }

    /**
     * Finds vessels by maximum draft requirement.
     *
     * @param maxDraft The maximum draft value
     * @return List of vessels meeting draft requirement
     */
    @Transactional(readOnly = true)
    public List<Vessel> findVesselsByDraft(Double maxDraft) {
        log.debug("Finding vessels with max draft <= {}", maxDraft);
        return vesselRepository.findByMaxDraftLessThanEqual(maxDraft);
    }

    /**
     * Updates vessel information with validation and notification.
     *
     * @param vesselId The ID of vessel to update
     * @param vesselUpdate The updated vessel data
     * @return The updated vessel
     * @throws VesselNotFoundException if vessel not found
     */
    @Transactional
    @CacheEvict(allEntries = true)
    public Vessel updateVessel(Long vesselId, @Valid Vessel vesselUpdate) {
        log.info("Updating vessel with ID: {}", vesselId);
        
        Vessel existingVessel = vesselRepository.findById(vesselId)
            .orElseThrow(() -> new VesselNotFoundException("Vessel not found with ID: " + vesselId));

        // Update fields while preserving immutable data
        existingVessel.setName(vesselUpdate.getName());
        existingVessel.setType(vesselUpdate.getType());
        existingVessel.setFlag(vesselUpdate.getFlag());
        existingVessel.setLength(vesselUpdate.getLength());
        existingVessel.setWidth(vesselUpdate.getWidth());
        existingVessel.setMaxDraft(vesselUpdate.getMaxDraft());
        existingVessel.setOwner(vesselUpdate.getOwner());
        existingVessel.setUpdatedAt(LocalDateTime.now());

        Vessel updatedVessel = vesselRepository.save(existingVessel);
        
        // Publish update event
        eventPublisher.publishEvent(new VesselUpdatedEvent(updatedVessel));
        
        // Synchronize with TOS
        synchronizeVesselWithTOS(updatedVessel);
        
        log.info("Successfully updated vessel: {}", updatedVessel.getName());
        return updatedVessel;
    }

    /**
     * Notifies Terminal Operating System about new vessel registration.
     *
     * @param vessel The newly registered vessel
     */
    @CircuitBreaker(name = "tosIntegration", fallbackMethod = "handleTOSIntegrationFailure")
    private void notifyTOSAboutNewVessel(Vessel vessel) {
        try {
            tosIntegrationService.notifyNewVessel(vessel);
            log.info("Successfully notified TOS about new vessel: {}", vessel.getImoNumber());
        } catch (Exception e) {
            log.error("Failed to notify TOS about new vessel: {}", vessel.getImoNumber(), e);
            metricService.recordTOSIntegrationFailure();
        }
    }

    /**
     * Synchronizes vessel data with Terminal Operating System.
     *
     * @param vessel The vessel to synchronize
     */
    @CircuitBreaker(name = "tosIntegration", fallbackMethod = "handleTOSIntegrationFailure")
    private void synchronizeVesselWithTOS(Vessel vessel) {
        try {
            tosIntegrationService.synchronizeVessel(vessel);
            log.info("Successfully synchronized vessel with TOS: {}", vessel.getImoNumber());
        } catch (Exception e) {
            log.error("Failed to synchronize vessel with TOS: {}", vessel.getImoNumber(), e);
            metricService.recordTOSIntegrationFailure();
        }
    }

    /**
     * Fallback method for TOS integration failures.
     */
    private void handleTOSIntegrationFailure(Vessel vessel, Exception e) {
        log.error("Circuit breaker triggered for TOS integration: {}", e.getMessage());
        metricService.recordCircuitBreakerTriggered();
    }
}