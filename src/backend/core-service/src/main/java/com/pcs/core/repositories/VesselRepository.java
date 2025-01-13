package com.pcs.core.repositories;

import com.pcs.core.entities.Vessel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for managing vessel data persistence and queries in the Port Community System.
 * Provides comprehensive methods for vessel lookups and filtering based on various criteria.
 */
@Repository
public interface VesselRepository extends JpaRepository<Vessel, Long> {

    /**
     * Retrieves a vessel by its IMO number.
     * 
     * @param imoNumber the IMO number in format IMO followed by 7 digits
     * @return Optional containing the vessel if found, empty if not found
     */
    Optional<Vessel> findByImoNumber(String imoNumber);

    /**
     * Searches for vessels by name using case-insensitive partial matching.
     * 
     * @param name the vessel name or partial name to search for
     * @return List of vessels matching the name pattern
     */
    @Query("SELECT v FROM Vessel v WHERE LOWER(v.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Vessel> findByName(@Param("name") String name);

    /**
     * Retrieves vessels by flag country using case-insensitive matching.
     * 
     * @param flag the country flag to search for
     * @return List of vessels registered under the specified flag
     */
    @Query("SELECT v FROM Vessel v WHERE LOWER(v.flag) = LOWER(:flag)")
    List<Vessel> findByFlag(@Param("flag") String flag);

    /**
     * Finds vessels with maximum draft less than or equal to specified value.
     * Useful for berth allocation and draft restriction checks.
     * 
     * @param maxDraft the maximum allowable draft value
     * @return List of vessels meeting the draft requirement
     */
    @Query("SELECT v FROM Vessel v WHERE v.maxDraft <= :maxDraft ORDER BY v.maxDraft ASC")
    List<Vessel> findByMaxDraftLessThanEqual(@Param("maxDraft") Double maxDraft);

    /**
     * Searches for vessels by type using case-insensitive matching.
     * 
     * @param type the vessel type to search for
     * @return List of vessels of the specified type
     */
    @Query("SELECT v FROM Vessel v WHERE LOWER(v.type) = LOWER(:type)")
    List<Vessel> findByType(@Param("type") String type);

    /**
     * Finds vessels by owner using case-insensitive partial matching.
     * 
     * @param owner the vessel owner name or partial name
     * @return List of vessels owned by the specified company
     */
    @Query("SELECT v FROM Vessel v WHERE LOWER(v.owner) LIKE LOWER(CONCAT('%', :owner, '%'))")
    List<Vessel> findByOwner(@Param("owner") String owner);

    /**
     * Retrieves vessels with length less than or equal to specified value.
     * Useful for berth length compatibility checks.
     * 
     * @param maxLength the maximum vessel length
     * @return List of vessels meeting the length requirement
     */
    @Query("SELECT v FROM Vessel v WHERE v.length <= :maxLength ORDER BY v.length ASC")
    List<Vessel> findByLengthLessThanEqual(@Param("maxLength") Double maxLength);

    /**
     * Finds vessels updated after a specific date.
     * 
     * @param registrationPort the port of registration
     * @return List of vessels registered at the specified port
     */
    @Query("SELECT v FROM Vessel v WHERE LOWER(v.registrationPort) = LOWER(:registrationPort)")
    List<Vessel> findByRegistrationPort(@Param("registrationPort") String registrationPort);

    /**
     * Checks if a vessel exists with the given IMO number.
     * 
     * @param imoNumber the IMO number to check
     * @return true if vessel exists, false otherwise
     */
    boolean existsByImoNumber(String imoNumber);
}