package com.pcs.core.services;

import com.pcs.core.entities.Cargo;
import com.pcs.core.repositories.CargoRepository;
import com.pcs.core.dto.CargoManifestDTO;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Service class implementing comprehensive cargo management business logic for the Port Community System.
 * Provides enhanced functionality for cargo tracking, customs integration, and document management.
 *
 * @version 1.0
 */
@Service
@Transactional
public class CargoService {

    private static final Logger logger = LoggerFactory.getLogger(CargoService.class);
    private final CargoRepository cargoRepository;

    /**
     * Constructs CargoService with required dependencies.
     *
     * @param cargoRepository Repository for cargo data access
     */
    @Autowired
    public CargoService(CargoRepository cargoRepository) {
        this.cargoRepository = cargoRepository;
    }

    /**
     * Creates a new cargo manifest with comprehensive validation.
     *
     * @param cargoManifestDTO The cargo manifest data
     * @return Created cargo manifest
     * @throws IllegalArgumentException if validation fails
     */
    public CargoManifestDTO createCargoManifest(CargoManifestDTO cargoManifestDTO) {
        logger.info("Creating new cargo manifest for vessel call: {}", cargoManifestDTO.getVesselCallId());
        
        if (!cargoManifestDTO.validate()) {
            logger.error("Cargo manifest validation failed");
            throw new IllegalArgumentException("Invalid cargo manifest data");
        }

        Cargo cargo = Cargo.builder()
                .vesselCallId(cargoManifestDTO.getVesselCallId())
                .cargoType(cargoManifestDTO.getCargoType())
                .weight(cargoManifestDTO.getWeight())
                .volume(cargoManifestDTO.getVolume())
                .consigneeId(cargoManifestDTO.getConsigneeId())
                .status("REGISTERED")
                .location(cargoManifestDTO.getLocation())
                .documentReference(cargoManifestDTO.getDocumentReference())
                .customsStatus("PENDING")
                .build();

        Cargo savedCargo = cargoRepository.save(cargo);
        logger.info("Cargo manifest created successfully with ID: {}", savedCargo.getId());
        
        return CargoManifestDTO.fromEntity(savedCargo);
    }

    /**
     * Updates cargo status with enhanced tracking and validation.
     *
     * @param id Cargo ID
     * @param status New status
     * @param customsStatus New customs status
     * @return Updated cargo manifest
     * @throws IllegalStateException if cargo not found
     */
    public CargoManifestDTO updateCargoStatus(Long id, String status, String customsStatus) {
        logger.info("Updating cargo status for ID: {}", id);
        
        Cargo cargo = cargoRepository.findById(id)
                .orElseThrow(() -> new IllegalStateException("Cargo not found with ID: " + id));

        validateStatusTransition(cargo.getStatus(), status);
        
        cargo.setStatus(status);
        cargo.setCustomsStatus(customsStatus);
        cargo.setUpdatedAt(LocalDateTime.now());

        Cargo updatedCargo = cargoRepository.save(cargo);
        logger.info("Cargo status updated successfully for ID: {}", id);
        
        return CargoManifestDTO.fromEntity(updatedCargo);
    }

    /**
     * Retrieves paginated cargo manifests by status with enhanced filtering.
     *
     * @param status Cargo status
     * @param customsStatus Customs status
     * @param pageable Pagination parameters
     * @return Page of cargo manifests
     */
    public Page<CargoManifestDTO> getCargoByStatus(String status, String customsStatus, Pageable pageable) {
        logger.info("Retrieving cargo manifests by status: {}, customs status: {}", status, customsStatus);
        
        Page<Cargo> cargoPage = cargoRepository.findByStatus(status, pageable);
        return cargoPage.map(CargoManifestDTO::fromEntity);
    }

    /**
     * Retrieves cargo manifest by document reference.
     *
     * @param documentReference Document reference number
     * @return Optional cargo manifest
     */
    public Optional<CargoManifestDTO> getCargoByDocumentReference(String documentReference) {
        logger.info("Retrieving cargo by document reference: {}", documentReference);
        
        return cargoRepository.findByDocumentReference(documentReference)
                .map(CargoManifestDTO::fromEntity);
    }

    /**
     * Retrieves cargo manifests for a specific vessel call.
     *
     * @param vesselCallId Vessel call ID
     * @return List of cargo manifests
     */
    public List<CargoManifestDTO> getCargoByVesselCall(Long vesselCallId) {
        logger.info("Retrieving cargo manifests for vessel call: {}", vesselCallId);
        
        return cargoRepository.findByVesselCallId(vesselCallId)
                .stream()
                .map(CargoManifestDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves paginated cargo manifests by location.
     *
     * @param location Cargo location
     * @param pageable Pagination parameters
     * @return Page of cargo manifests
     */
    public Page<CargoManifestDTO> getCargoByLocation(String location, Pageable pageable) {
        logger.info("Retrieving cargo manifests by location: {}", location);
        
        return cargoRepository.findByLocation(location, pageable)
                .map(CargoManifestDTO::fromEntity);
    }

    /**
     * Validates cargo status transition according to business rules.
     *
     * @param currentStatus Current cargo status
     * @param newStatus Proposed new status
     * @throws IllegalStateException if transition is invalid
     */
    private void validateStatusTransition(String currentStatus, String newStatus) {
        // Define valid status transitions
        if (currentStatus.equals("REGISTERED") && !newStatus.equals("IN_TRANSIT") && 
            !newStatus.equals("CUSTOMS_HOLD")) {
            throw new IllegalStateException("Invalid status transition from REGISTERED to " + newStatus);
        }
        if (currentStatus.equals("IN_TRANSIT") && !newStatus.equals("DELIVERED") && 
            !newStatus.equals("CUSTOMS_HOLD")) {
            throw new IllegalStateException("Invalid status transition from IN_TRANSIT to " + newStatus);
        }
        logger.debug("Status transition validated: {} -> {}", currentStatus, newStatus);
    }

    /**
     * Retrieves cargo analytics by consignee.
     *
     * @param consigneeId Consignee ID
     * @return Cargo statistics
     */
    public CargoStatistics getCargoStatisticsByConsignee(Long consigneeId) {
        logger.info("Retrieving cargo statistics for consignee: {}", consigneeId);
        
        Long totalCargo = cargoRepository.countByConsigneeId(consigneeId);
        // Additional statistics calculation logic here
        
        return new CargoStatistics(totalCargo);
    }

    /**
     * Inner class for cargo statistics.
     */
    private static class CargoStatistics {
        private final Long totalCargo;

        public CargoStatistics(Long totalCargo) {
            this.totalCargo = totalCargo;
        }

        public Long getTotalCargo() {
            return totalCargo;
        }
    }
}