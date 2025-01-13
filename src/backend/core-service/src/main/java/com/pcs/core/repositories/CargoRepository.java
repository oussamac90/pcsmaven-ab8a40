package com.pcs.core.repositories;

import com.pcs.core.entities.Cargo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository interface for Cargo entity providing optimized data access operations.
 * Implements comprehensive cargo tracking, status management, and vessel-cargo relationship queries
 * with pagination support for efficient data retrieval.
 * 
 * @version 3.0.0 (Spring Data JPA)
 */
@Repository
public interface CargoRepository extends JpaRepository<Cargo, Long> {

    /**
     * Retrieves all cargo manifests associated with a specific vessel call.
     * Query is optimized with database indexing on vessel_call_id column.
     *
     * @param vesselCallId the ID of the vessel call
     * @return ordered list of cargo manifests for the vessel call
     */
    @Query("SELECT c FROM Cargo c WHERE c.vesselCallId = :vesselCallId ORDER BY c.createdAt DESC")
    List<Cargo> findByVesselCallId(@Param("vesselCallId") Long vesselCallId);

    /**
     * Retrieves paginated list of cargo manifests with a specific status.
     * Supports efficient handling of large result sets with pagination metadata.
     *
     * @param status the cargo status to filter by
     * @param pageable pagination parameters including size, page number and sorting
     * @return paginated result containing cargo manifests and metadata
     */
    Page<Cargo> findByStatus(String status, Pageable pageable);

    /**
     * Retrieves paginated list of cargo manifests for a specific consignee.
     * Implements sorting and pagination for optimized data retrieval.
     *
     * @param consigneeId the ID of the consignee
     * @param pageable pagination parameters including size, page number and sorting
     * @return paginated result of consignee's cargo manifests with metadata
     */
    Page<Cargo> findByConsigneeId(Long consigneeId, Pageable pageable);

    /**
     * Efficiently counts cargo manifests with a specific status using database optimization.
     *
     * @param status the cargo status to count
     * @return total count of cargo manifests with the given status
     */
    Long countByStatus(String status);

    /**
     * Finds cargo manifests by location with pagination support.
     * Useful for tracking cargo at specific port locations.
     *
     * @param location the cargo location to filter by
     * @param pageable pagination parameters
     * @return paginated result of cargo manifests at the specified location
     */
    Page<Cargo> findByLocation(String location, Pageable pageable);

    /**
     * Retrieves cargo manifests by customs status with pagination.
     * Supports customs clearance tracking and monitoring.
     *
     * @param customsStatus the customs clearance status
     * @param pageable pagination parameters
     * @return paginated result of cargo manifests with specified customs status
     */
    Page<Cargo> findByCustomsStatus(String customsStatus, Pageable pageable);

    /**
     * Finds cargo manifest by document reference number.
     * Optimized for unique document reference lookups.
     *
     * @param documentReference the unique document reference number
     * @return optional containing the cargo manifest if found
     */
    Optional<Cargo> findByDocumentReference(String documentReference);

    /**
     * Retrieves cargo manifests by type with pagination support.
     * Enables filtering and analysis by cargo type.
     *
     * @param cargoType the type of cargo
     * @param pageable pagination parameters
     * @return paginated result of cargo manifests of specified type
     */
    Page<Cargo> findByCargoType(String cargoType, Pageable pageable);

    /**
     * Finds cargo manifests by vessel call ID and status.
     * Supports vessel-specific cargo status monitoring.
     *
     * @param vesselCallId the ID of the vessel call
     * @param status the cargo status
     * @return list of cargo manifests matching criteria
     */
    List<Cargo> findByVesselCallIdAndStatus(Long vesselCallId, String status);

    /**
     * Counts cargo manifests by consignee ID.
     * Provides efficient consignee-specific cargo volume analytics.
     *
     * @param consigneeId the ID of the consignee
     * @return total count of cargo manifests for the consignee
     */
    Long countByConsigneeId(Long consigneeId);
}