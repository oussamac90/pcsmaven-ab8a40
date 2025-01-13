package com.pcs.core.services;

import com.pcs.core.entities.Berth;
import com.pcs.core.repositories.BerthRepository;
import com.pcs.core.dto.BerthRequestDTO;
import com.pcs.core.events.BerthAllocationEvent;
import com.pcs.core.exceptions.BerthAllocationException;
import com.pcs.core.exceptions.ResourceNotFoundException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import io.micrometer.core.annotation.Timed;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;

/**
 * Service class implementing comprehensive berth management and allocation logic.
 * Provides functionality for berth availability checks, allocation requests,
 * and status updates with enhanced validation and monitoring capabilities.
 */
@Service
@Slf4j
@Transactional(isolation = Isolation.REPEATABLE_READ)
public class BerthService {

    private final BerthRepository berthRepository;
    private final ApplicationEventPublisher eventPublisher;
    private static final String BERTH_NOT_FOUND = "Berth not found with ID: ";
    private static final String STATUS_AVAILABLE = "AVAILABLE";
    private static final String STATUS_ALLOCATED = "ALLOCATED";

    public BerthService(BerthRepository berthRepository, 
                       ApplicationEventPublisher eventPublisher) {
        this.berthRepository = berthRepository;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Retrieves all berths for a specific port with caching support.
     *
     * @param portId ID of the port
     * @return List of berths in the specified port
     */
    @Cacheable(value = "berthCache", key = "#portId")
    @Timed(value = "berth.query.port", description = "Time taken to retrieve berths by port")
    public List<Berth> getAllBerthsByPort(Long portId) {
        log.debug("Retrieving berths for port ID: {}", portId);
        return berthRepository.findByPortId(portId);
    }

    /**
     * Performs comprehensive berth availability check with validation.
     *
     * @param berthId ID of the berth to check
     * @param request Berth request details
     * @return true if berth is available and suitable
     * @throws BerthAllocationException if validation fails
     */
    @Timed(value = "berth.availability.check")
    public boolean checkBerthAvailability(Long berthId, BerthRequestDTO request) {
        log.debug("Checking availability for berth ID: {} for request: {}", berthId, request);
        
        Berth berth = berthRepository.findById(berthId)
            .orElseThrow(() -> new ResourceNotFoundException(BERTH_NOT_FOUND + berthId));

        // Validate physical constraints
        if (request.getVesselLength() > berth.getLength() || 
            request.getVesselDraft() > berth.getDepth()) {
            throw new BerthAllocationException("Vessel dimensions exceed berth capacity");
        }

        // Validate berth status
        if (!STATUS_AVAILABLE.equals(berth.getStatus())) {
            return false;
        }

        // Check for scheduling conflicts
        List<Berth> conflictingAllocations = berthRepository.findConflictingAllocations(
            berthId, 
            request.getRequestedStartTime(), 
            request.getRequestedEndTime()
        );

        return conflictingAllocations.isEmpty();
    }

    /**
     * Processes berth allocation request with comprehensive validation and monitoring.
     *
     * @param request Berth allocation request details
     * @return Allocated berth details
     * @throws BerthAllocationException if allocation fails
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @Timed(value = "berth.allocation.process")
    public Berth allocateBerth(BerthRequestDTO request) {
        log.info("Processing berth allocation request: {}", request);

        // Validate request timing
        validateRequestTiming(request);

        // Check availability
        if (!checkBerthAvailability(request.getBerthId(), request)) {
            throw new BerthAllocationException("Berth is not available for requested time slot");
        }

        // Retrieve and lock berth for allocation
        Berth berth = berthRepository.findById(request.getBerthId())
            .orElseThrow(() -> new ResourceNotFoundException(BERTH_NOT_FOUND + request.getBerthId()));

        try {
            // Update berth status
            berth.setStatus(STATUS_ALLOCATED);
            berth = berthRepository.save(berth);

            // Publish allocation event
            eventPublisher.publishEvent(new BerthAllocationEvent(
                this,
                berth.getId(),
                request.getVesselCallId(),
                request.getRequestedStartTime(),
                request.getRequestedEndTime()
            ));

            log.info("Successfully allocated berth ID: {} for vessel call ID: {}", 
                    berth.getId(), request.getVesselCallId());

            return berth;

        } catch (Exception e) {
            log.error("Failed to allocate berth: {}", e.getMessage());
            throw new BerthAllocationException("Failed to allocate berth: " + e.getMessage());
        }
    }

    /**
     * Updates berth status with optimistic locking.
     *
     * @param berthId ID of the berth
     * @param newStatus New status to set
     * @return Updated berth details
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @Timed(value = "berth.status.update")
    public Berth updateBerthStatus(Long berthId, String newStatus) {
        log.debug("Updating status for berth ID: {} to: {}", berthId, newStatus);
        
        Berth berth = berthRepository.findById(berthId)
            .orElseThrow(() -> new ResourceNotFoundException(BERTH_NOT_FOUND + berthId));

        berth.setStatus(newStatus);
        return berthRepository.save(berth);
    }

    /**
     * Validates berth request timing constraints.
     *
     * @param request Berth request to validate
     * @throws BerthAllocationException if validation fails
     */
    private void validateRequestTiming(BerthRequestDTO request) {
        LocalDateTime now = LocalDateTime.now();
        
        if (request.getRequestedStartTime().isBefore(now)) {
            throw new BerthAllocationException("Requested start time cannot be in the past");
        }
        
        if (request.getRequestedEndTime().isBefore(request.getRequestedStartTime())) {
            throw new BerthAllocationException("End time must be after start time");
        }
        
        if (request.getRequestedStartTime().plusHours(48).isBefore(request.getRequestedEndTime())) {
            throw new BerthAllocationException("Maximum berth allocation duration is 48 hours");
        }
    }
}