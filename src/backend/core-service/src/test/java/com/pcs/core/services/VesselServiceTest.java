package com.pcs.core.services;

import com.pcs.core.entities.Vessel;
import com.pcs.core.repositories.VesselRepository;
import com.pcs.core.exceptions.VesselNotFoundException;
import com.pcs.core.exceptions.DuplicateVesselException;
import com.pcs.core.events.VesselRegisteredEvent;
import com.pcs.core.integration.TOSIntegrationService;
import com.pcs.core.metrics.MetricService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.util.StopWatch;

import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
import static org.awaitility.Awaitility.await;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@ExtendWith(MockitoExtension.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class VesselServiceTest {

    @Mock
    private VesselRepository vesselRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private TOSIntegrationService tosIntegrationService;

    @Mock
    private MetricService metricService;

    private VesselService vesselService;
    private CacheManager cacheManager;
    private StopWatch stopWatch;

    @BeforeEach
    void setUp() {
        cacheManager = new ConcurrentMapCacheManager("vessels");
        vesselService = new VesselService(vesselRepository, eventPublisher, tosIntegrationService, metricService);
        stopWatch = new StopWatch();
    }

    @Test
    void testRegisterVessel_Success() {
        // Arrange
        Vessel vessel = Vessel.builder()
                .imoNumber("IMO1234567")
                .name("Test Vessel")
                .type("Container")
                .flag("Panama")
                .length(300.0)
                .width(40.0)
                .maxDraft(14.5)
                .owner("Test Shipping Line")
                .build();

        when(vesselRepository.existsByImoNumber("IMO1234567")).thenReturn(false);
        when(vesselRepository.save(any(Vessel.class))).thenReturn(vessel);

        // Act
        stopWatch.start();
        Vessel result = vesselService.registerVessel(vessel);
        stopWatch.stop();

        // Assert
        assertThat(stopWatch.getTotalTimeMillis()).isLessThan(2000); // Performance SLA check
        assertThat(result).isNotNull();
        assertThat(result.getImoNumber()).isEqualTo("IMO1234567");
        
        verify(vesselRepository).existsByImoNumber("IMO1234567");
        verify(vesselRepository).save(any(Vessel.class));
        verify(eventPublisher).publishEvent(any(VesselRegisteredEvent.class));
        verify(tosIntegrationService).notifyNewVessel(any(Vessel.class));
        verify(metricService).recordVesselRegistration();
    }

    @Test
    void testRegisterVessel_DuplicateIMO() {
        // Arrange
        Vessel vessel = Vessel.builder()
                .imoNumber("IMO1234567")
                .name("Test Vessel")
                .build();

        when(vesselRepository.existsByImoNumber("IMO1234567")).thenReturn(true);

        // Act & Assert
        assertThatThrownBy(() -> vesselService.registerVessel(vessel))
                .isInstanceOf(DuplicateVesselException.class)
                .hasMessageContaining("IMO1234567");
    }

    @Test
    void testFindVesselByImo_WithCaching() {
        // Arrange
        String imoNumber = "IMO1234567";
        Vessel vessel = Vessel.builder()
                .imoNumber(imoNumber)
                .name("Test Vessel")
                .build();

        when(vesselRepository.findByImoNumber(imoNumber)).thenReturn(Optional.of(vessel));

        // Act - First call (cache miss)
        Vessel result1 = vesselService.findVesselByImo(imoNumber);

        // Assert first call
        assertThat(result1).isNotNull();
        assertThat(result1.getImoNumber()).isEqualTo(imoNumber);

        // Act - Second call (should hit cache)
        Vessel result2 = vesselService.findVesselByImo(imoNumber);

        // Assert cache hit
        verify(vesselRepository, times(1)).findByImoNumber(imoNumber); // Repository should only be called once
        assertThat(result2).isEqualTo(result1);
    }

    @Test
    void testFindVesselByImo_NotFound() {
        // Arrange
        String imoNumber = "IMO1234567";
        when(vesselRepository.findByImoNumber(imoNumber)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> vesselService.findVesselByImo(imoNumber))
                .isInstanceOf(VesselNotFoundException.class)
                .hasMessageContaining(imoNumber);
    }

    @Test
    void testSearchVesselsByName() {
        // Arrange
        String vesselName = "Test";
        List<Vessel> expectedVessels = Arrays.asList(
            Vessel.builder().name("Test Vessel 1").build(),
            Vessel.builder().name("Test Vessel 2").build()
        );

        when(vesselRepository.findByName(vesselName)).thenReturn(expectedVessels);

        // Act
        List<Vessel> results = vesselService.searchVesselsByName(vesselName);

        // Assert
        assertThat(results).hasSize(2);
        assertThat(results).extracting("name")
                          .containsExactly("Test Vessel 1", "Test Vessel 2");
    }

    @Test
    void testUpdateVessel_Success() {
        // Arrange
        Long vesselId = 1L;
        Vessel existingVessel = Vessel.builder()
                .id(vesselId)
                .imoNumber("IMO1234567")
                .name("Old Name")
                .build();

        Vessel updateData = Vessel.builder()
                .name("New Name")
                .type("Container")
                .flag("Panama")
                .build();

        when(vesselRepository.findById(vesselId)).thenReturn(Optional.of(existingVessel));
        when(vesselRepository.save(any(Vessel.class))).thenReturn(existingVessel);

        // Act
        Vessel result = vesselService.updateVessel(vesselId, updateData);

        // Assert
        assertThat(result.getName()).isEqualTo("New Name");
        verify(eventPublisher).publishEvent(any());
        verify(tosIntegrationService).synchronizeVessel(any(Vessel.class));
    }

    @Test
    void testConcurrentVesselOperations() throws Exception {
        // Arrange
        int numOperations = 10;
        CompletableFuture<Vessel>[] futures = new CompletableFuture[numOperations];
        
        for (int i = 0; i < numOperations; i++) {
            String imoNumber = String.format("IMO%07d", i);
            Vessel vessel = Vessel.builder()
                    .imoNumber(imoNumber)
                    .name("Concurrent Test Vessel " + i)
                    .build();
            
            when(vesselRepository.existsByImoNumber(imoNumber)).thenReturn(false);
            when(vesselRepository.save(any(Vessel.class))).thenReturn(vessel);
            
            final int index = i;
            futures[i] = CompletableFuture.supplyAsync(() -> vesselService.registerVessel(vessel));
        }

        // Act
        CompletableFuture.allOf(futures).get(5, TimeUnit.SECONDS);

        // Assert
        verify(vesselRepository, times(numOperations)).save(any(Vessel.class));
        verify(eventPublisher, times(numOperations)).publishEvent(any());
    }

    @Test
    void testPerformanceUnderLoad() {
        // Arrange
        int numQueries = 100;
        String imoNumber = "IMO1234567";
        Vessel vessel = Vessel.builder()
                .imoNumber(imoNumber)
                .name("Performance Test Vessel")
                .build();

        when(vesselRepository.findByImoNumber(imoNumber)).thenReturn(Optional.of(vessel));

        // Act
        stopWatch.start();
        for (int i = 0; i < numQueries; i++) {
            vesselService.findVesselByImo(imoNumber);
        }
        stopWatch.stop();

        // Assert
        double avgResponseTime = stopWatch.getTotalTimeMillis() / (double) numQueries;
        assertThat(avgResponseTime).isLessThan(20.0); // Average response time under 20ms
        verify(vesselRepository, times(1)).findByImoNumber(imoNumber); // Verify caching worked
    }
}