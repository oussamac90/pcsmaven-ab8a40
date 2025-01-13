package com.pcs.core.services;

import com.pcs.core.entities.Berth;
import com.pcs.core.repositories.BerthRepository;
import com.pcs.core.dto.BerthRequestDTO;
import com.pcs.core.events.BerthAllocationEvent;
import com.pcs.core.exceptions.BerthAllocationException;
import com.pcs.core.exceptions.ResourceNotFoundException;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.InjectMocks;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Comprehensive test suite for BerthService class validating berth management operations
 * including availability checks, allocation logic, and conflict prevention.
 */
@ExtendWith(MockitoExtension.class)
public class BerthServiceTest {

    @Mock
    private BerthRepository berthRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private BerthService berthService;

    private Berth testBerth;
    private BerthRequestDTO testRequest;
    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        now = LocalDateTime.now();
        
        testBerth = Berth.builder()
                .id(1L)
                .portId(1L)
                .name("Test Berth")
                .length(300.0)
                .depth(15.0)
                .maxVesselSize("PANAMAX")
                .status("AVAILABLE")
                .createdAt(now)
                .updatedAt(now)
                .build();

        testRequest = BerthRequestDTO.builder()
                .vesselCallId(1L)
                .berthId(1L)
                .requestedStartTime(now.plusHours(2))
                .requestedEndTime(now.plusHours(10))
                .vesselName("Test Vessel")
                .vesselImo("IMO123456")
                .vesselLength(250.0)
                .vesselDraft(12.0)
                .cargoType("CONTAINER")
                .status("PENDING")
                .build();
    }

    @Test
    void getAllBerthsByPort_ShouldReturnBerthList() {
        // Arrange
        Long portId = 1L;
        List<Berth> expectedBerths = Arrays.asList(testBerth);
        when(berthRepository.findByPortId(portId)).thenReturn(expectedBerths);

        // Act
        List<Berth> actualBerths = berthService.getAllBerthsByPort(portId);

        // Assert
        assertThat(actualBerths)
            .isNotNull()
            .hasSize(1)
            .containsExactlyElementsOf(expectedBerths);
        verify(berthRepository).findByPortId(portId);
    }

    @Test
    void checkBerthAvailability_WithValidRequest_ShouldReturnTrue() {
        // Arrange
        when(berthRepository.findById(testRequest.getBerthId())).thenReturn(Optional.of(testBerth));
        when(berthRepository.findConflictingAllocations(
            eq(testRequest.getBerthId()),
            any(LocalDateTime.class),
            any(LocalDateTime.class)
        )).thenReturn(Arrays.asList());

        // Act
        boolean isAvailable = berthService.checkBerthAvailability(testRequest.getBerthId(), testRequest);

        // Assert
        assertThat(isAvailable).isTrue();
        verify(berthRepository).findById(testRequest.getBerthId());
        verify(berthRepository).findConflictingAllocations(
            eq(testRequest.getBerthId()),
            any(LocalDateTime.class),
            any(LocalDateTime.class)
        );
    }

    @Test
    void checkBerthAvailability_WithOversizedVessel_ShouldThrowException() {
        // Arrange
        testRequest.setVesselLength(350.0); // Exceeds berth length
        when(berthRepository.findById(testRequest.getBerthId())).thenReturn(Optional.of(testBerth));

        // Act & Assert
        assertThatThrownBy(() -> 
            berthService.checkBerthAvailability(testRequest.getBerthId(), testRequest)
        )
            .isInstanceOf(BerthAllocationException.class)
            .hasMessageContaining("Vessel dimensions exceed berth capacity");
    }

    @Test
    void allocateBerth_WithValidRequest_ShouldSucceed() {
        // Arrange
        when(berthRepository.findById(testRequest.getBerthId())).thenReturn(Optional.of(testBerth));
        when(berthRepository.findConflictingAllocations(
            eq(testRequest.getBerthId()),
            any(LocalDateTime.class),
            any(LocalDateTime.class)
        )).thenReturn(Arrays.asList());
        when(berthRepository.save(any(Berth.class))).thenReturn(testBerth);

        // Act
        Berth allocatedBerth = berthService.allocateBerth(testRequest);

        // Assert
        assertThat(allocatedBerth)
            .isNotNull()
            .extracting("status")
            .isEqualTo("ALLOCATED");

        verify(eventPublisher).publishEvent(any(BerthAllocationEvent.class));
        verify(berthRepository).save(any(Berth.class));
    }

    @Test
    void allocateBerth_WithPastStartTime_ShouldThrowException() {
        // Arrange
        testRequest.setRequestedStartTime(now.minusHours(1));

        // Act & Assert
        assertThatThrownBy(() -> 
            berthService.allocateBerth(testRequest)
        )
            .isInstanceOf(BerthAllocationException.class)
            .hasMessageContaining("Requested start time cannot be in the past");
    }

    @Test
    void allocateBerth_WithInvalidTimeRange_ShouldThrowException() {
        // Arrange
        testRequest.setRequestedEndTime(testRequest.getRequestedStartTime().minusHours(1));

        // Act & Assert
        assertThatThrownBy(() -> 
            berthService.allocateBerth(testRequest)
        )
            .isInstanceOf(BerthAllocationException.class)
            .hasMessageContaining("End time must be after start time");
    }

    @Test
    void updateBerthStatus_WithValidStatus_ShouldSucceed() {
        // Arrange
        String newStatus = "MAINTENANCE";
        when(berthRepository.findById(testBerth.getId())).thenReturn(Optional.of(testBerth));
        when(berthRepository.save(any(Berth.class))).thenReturn(testBerth);

        // Act
        Berth updatedBerth = berthService.updateBerthStatus(testBerth.getId(), newStatus);

        // Assert
        assertThat(updatedBerth)
            .isNotNull()
            .extracting("status")
            .isEqualTo(newStatus);
        
        verify(berthRepository).save(any(Berth.class));
    }

    @Test
    void updateBerthStatus_WithNonexistentBerth_ShouldThrowException() {
        // Arrange
        Long nonexistentBerthId = 999L;
        when(berthRepository.findById(nonexistentBerthId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> 
            berthService.updateBerthStatus(nonexistentBerthId, "MAINTENANCE")
        )
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Berth not found with ID: " + nonexistentBerthId);
    }

    @Test
    void allocateBerth_WithConflictingAllocation_ShouldThrowException() {
        // Arrange
        when(berthRepository.findById(testRequest.getBerthId())).thenReturn(Optional.of(testBerth));
        when(berthRepository.findConflictingAllocations(
            eq(testRequest.getBerthId()),
            any(LocalDateTime.class),
            any(LocalDateTime.class)
        )).thenReturn(Arrays.asList(testBerth));

        // Act & Assert
        assertThatThrownBy(() -> 
            berthService.allocateBerth(testRequest)
        )
            .isInstanceOf(BerthAllocationException.class)
            .hasMessageContaining("Berth is not available for requested time slot");
    }

    @Test
    void allocateBerth_WithExcessiveDuration_ShouldThrowException() {
        // Arrange
        testRequest.setRequestedEndTime(testRequest.getRequestedStartTime().plusHours(49));

        // Act & Assert
        assertThatThrownBy(() -> 
            berthService.allocateBerth(testRequest)
        )
            .isInstanceOf(BerthAllocationException.class)
            .hasMessageContaining("Maximum berth allocation duration is 48 hours");
    }
}