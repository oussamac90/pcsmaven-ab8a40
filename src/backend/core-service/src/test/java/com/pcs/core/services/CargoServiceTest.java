package com.pcs.core.services;

import com.pcs.core.dto.CargoManifestDTO;
import com.pcs.core.entities.Cargo;
import com.pcs.core.repositories.CargoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Comprehensive test suite for CargoService verifying cargo manifest management,
 * tracking, status updates, and pagination functionality.
 * 
 * @version 1.0
 */
@ExtendWith(MockitoExtension.class)
class CargoServiceTest {

    @Mock
    private CargoRepository cargoRepository;

    @InjectMocks
    private CargoService cargoService;

    private Cargo testCargo;
    private CargoManifestDTO testCargoDTO;
    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        now = LocalDateTime.now();
        
        testCargo = Cargo.builder()
                .id(1L)
                .vesselCallId(100L)
                .cargoType("CONTAINER")
                .weight(1000.0)
                .volume(100.0)
                .consigneeId(200L)
                .status("REGISTERED")
                .location("BERTH-A")
                .documentReference("DOC-001")
                .customsStatus("PENDING")
                .createdAt(now)
                .updatedAt(now)
                .build();

        testCargoDTO = CargoManifestDTO.builder()
                .vesselCallId(100L)
                .cargoType("CONTAINER")
                .weight(1000.0)
                .volume(100.0)
                .consigneeId(200L)
                .status("REGISTERED")
                .location("BERTH-A")
                .documentReference("DOC-001")
                .customsStatus("PENDING")
                .build();
    }

    @Nested
    @DisplayName("Create Cargo Manifest Tests")
    class CreateCargoManifestTests {

        @Test
        @DisplayName("Should successfully create cargo manifest with valid data")
        void testCreateCargoManifest() {
            when(cargoRepository.save(any(Cargo.class))).thenReturn(testCargo);

            CargoManifestDTO result = cargoService.createCargoManifest(testCargoDTO);

            assertNotNull(result);
            assertEquals(testCargo.getId(), result.getId());
            assertEquals(testCargo.getVesselCallId(), result.getVesselCallId());
            assertEquals(testCargo.getCargoType(), result.getCargoType());
            verify(cargoRepository, times(1)).save(any(Cargo.class));
        }

        @Test
        @DisplayName("Should throw exception when creating cargo manifest with invalid data")
        void testCreateCargoManifestValidationFailure() {
            testCargoDTO.setWeight(-1.0); // Invalid weight

            assertThrows(IllegalArgumentException.class, () -> 
                cargoService.createCargoManifest(testCargoDTO));

            verify(cargoRepository, never()).save(any(Cargo.class));
        }
    }

    @Nested
    @DisplayName("Update Cargo Status Tests")
    class UpdateCargoStatusTests {

        @Test
        @DisplayName("Should successfully update cargo status with valid transition")
        void testUpdateCargoStatus() {
            when(cargoRepository.findById(1L)).thenReturn(Optional.of(testCargo));
            when(cargoRepository.save(any(Cargo.class))).thenReturn(testCargo);

            CargoManifestDTO result = cargoService.updateCargoStatus(1L, "IN_TRANSIT", "CLEARED");

            assertNotNull(result);
            assertEquals("IN_TRANSIT", result.getStatus());
            assertEquals("CLEARED", result.getCustomsStatus());
            verify(cargoRepository, times(1)).save(any(Cargo.class));
        }

        @Test
        @DisplayName("Should throw exception when updating with invalid status transition")
        void testUpdateCargoStatusInvalidTransition() {
            when(cargoRepository.findById(1L)).thenReturn(Optional.of(testCargo));

            assertThrows(IllegalStateException.class, () ->
                cargoService.updateCargoStatus(1L, "COMPLETED", "CLEARED"));

            verify(cargoRepository, never()).save(any(Cargo.class));
        }

        @Test
        @DisplayName("Should throw exception when updating non-existent cargo")
        void testUpdateCargoStatusNotFound() {
            when(cargoRepository.findById(1L)).thenReturn(Optional.empty());

            assertThrows(IllegalStateException.class, () ->
                cargoService.updateCargoStatus(1L, "IN_TRANSIT", "CLEARED"));
        }
    }

    @Nested
    @DisplayName("Cargo Retrieval Tests")
    class CargoRetrievalTests {

        @Test
        @DisplayName("Should retrieve cargo manifests by vessel call")
        void testGetCargoByVesselCall() {
            List<Cargo> cargoList = Arrays.asList(testCargo);
            when(cargoRepository.findByVesselCallId(100L)).thenReturn(cargoList);

            List<CargoManifestDTO> results = cargoService.getCargoByVesselCall(100L);

            assertNotNull(results);
            assertEquals(1, results.size());
            assertEquals(testCargo.getId(), results.get(0).getId());
            verify(cargoRepository, times(1)).findByVesselCallId(100L);
        }

        @Test
        @DisplayName("Should retrieve paginated cargo manifests by status")
        void testGetCargoByStatus() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Cargo> cargoPage = new PageImpl<>(Arrays.asList(testCargo));
            
            when(cargoRepository.findByStatus("REGISTERED", pageable)).thenReturn(cargoPage);

            Page<CargoManifestDTO> results = cargoService.getCargoByStatus("REGISTERED", "PENDING", pageable);

            assertNotNull(results);
            assertEquals(1, results.getTotalElements());
            assertEquals(testCargo.getId(), results.getContent().get(0).getId());
            verify(cargoRepository, times(1)).findByStatus("REGISTERED", pageable);
        }

        @Test
        @DisplayName("Should retrieve cargo manifest by document reference")
        void testGetCargoByDocumentReference() {
            when(cargoRepository.findByDocumentReference("DOC-001")).thenReturn(Optional.of(testCargo));

            Optional<CargoManifestDTO> result = cargoService.getCargoByDocumentReference("DOC-001");

            assertTrue(result.isPresent());
            assertEquals(testCargo.getId(), result.get().getId());
            assertEquals(testCargo.getDocumentReference(), result.get().getDocumentReference());
            verify(cargoRepository, times(1)).findByDocumentReference("DOC-001");
        }
    }

    @Nested
    @DisplayName("Cargo Location Tests")
    class CargoLocationTests {

        @Test
        @DisplayName("Should retrieve paginated cargo manifests by location")
        void testGetCargoByLocation() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Cargo> cargoPage = new PageImpl<>(Arrays.asList(testCargo));
            
            when(cargoRepository.findByLocation("BERTH-A", pageable)).thenReturn(cargoPage);

            Page<CargoManifestDTO> results = cargoService.getCargoByLocation("BERTH-A", pageable);

            assertNotNull(results);
            assertEquals(1, results.getTotalElements());
            assertEquals("BERTH-A", results.getContent().get(0).getLocation());
            verify(cargoRepository, times(1)).findByLocation("BERTH-A", pageable);
        }
    }

    @Nested
    @DisplayName("Cargo Statistics Tests")
    class CargoStatisticsTests {

        @Test
        @DisplayName("Should retrieve cargo statistics by consignee")
        void testGetCargoStatisticsByConsignee() {
            when(cargoRepository.countByConsigneeId(200L)).thenReturn(5L);

            CargoService.CargoStatistics stats = cargoService.getCargoStatisticsByConsignee(200L);

            assertNotNull(stats);
            assertEquals(5L, stats.getTotalCargo());
            verify(cargoRepository, times(1)).countByConsigneeId(200L);
        }
    }
}