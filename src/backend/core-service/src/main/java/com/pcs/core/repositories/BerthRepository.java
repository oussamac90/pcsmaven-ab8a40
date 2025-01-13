package com.pcs.core.repositories;

import com.pcs.core.entities.Berth;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for managing Berth entities in the Port Community System.
 * Provides optimized data access methods with caching support for berth-related operations.
 */
@Repository
public interface BerthRepository extends JpaRepository<Berth, Long> {

    /**
     * Retrieves all berths associated with a specific port.
     * Results are cached to improve performance for frequently accessed ports.
     *
     * @param portId The ID of the port
     * @return List of berths in the specified port ordered by berth name
     */
    @Query("SELECT b FROM Berth b WHERE b.portId = :portId ORDER BY b.name")
    @Cacheable(value = "berthsByPort", key = "#portId")
    List<Berth> findByPortId(@Param("portId") Long portId);

    /**
     * Retrieves all berths that are currently available for allocation.
     * Results are cached to optimize berth availability checks.
     *
     * @return List of available berths ordered by port ID and berth name
     */
    @Query("SELECT b FROM Berth b WHERE b.status = 'AVAILABLE' ORDER BY b.portId, b.name")
    @Cacheable(value = "availableBerths")
    List<Berth> findAvailableBerths();

    /**
     * Finds a specific berth by its ID and current status.
     * Uses composite indexing for optimized lookup performance.
     *
     * @param id The berth ID
     * @param status The current status to match
     * @return Optional containing the matching berth if found
     */
    @Query("SELECT b FROM Berth b WHERE b.id = :id AND b.status = :status")
    @Cacheable(value = "berthByIdAndStatus", key = "#id + '_' + #status")
    Optional<Berth> findByIdAndStatus(@Param("id") Long id, @Param("status") String status);

    /**
     * Finds berths suitable for a vessel based on physical constraints.
     * Uses indexes on length and depth fields for efficient filtering.
     *
     * @param minLength Minimum required berth length
     * @param minDepth Minimum required berth depth
     * @return List of berths meeting the physical requirements
     */
    @Query("SELECT b FROM Berth b WHERE b.length >= :minLength AND b.depth >= :minDepth AND b.status = 'AVAILABLE' ORDER BY b.portId, b.name")
    @Cacheable(value = "suitableBerths", key = "#minLength + '_' + #minDepth")
    List<Berth> findSuitableBerths(@Param("minLength") Double minLength, @Param("minDepth") Double minDepth);

    /**
     * Finds berths by port ID and status for filtered queries.
     * Combines port and status filtering with proper indexing.
     *
     * @param portId The ID of the port
     * @param status The berth status to filter by
     * @return List of matching berths
     */
    @Query("SELECT b FROM Berth b WHERE b.portId = :portId AND b.status = :status ORDER BY b.name")
    @Cacheable(value = "berthsByPortAndStatus", key = "#portId + '_' + #status")
    List<Berth> findByPortIdAndStatus(@Param("portId") Long portId, @Param("status") String status);

    /**
     * Finds berths that can accommodate a specific vessel size.
     * Filters based on the maximum vessel size constraint.
     *
     * @param maxVesselSize The maximum vessel size to accommodate
     * @return List of berths that can handle the specified vessel size
     */
    @Query("SELECT b FROM Berth b WHERE b.maxVesselSize >= :maxVesselSize AND b.status = 'AVAILABLE' ORDER BY b.portId, b.name")
    @Cacheable(value = "berthsByVesselSize", key = "#maxVesselSize")
    List<Berth> findByMaxVesselSize(@Param("maxVesselSize") String maxVesselSize);
}