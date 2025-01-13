// External imports with versions
import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5

// Internal imports
import { CargoManifest, CargoStatus, CargoTracking, CargoType } from '../../types/cargo.types';
import { CargoService } from '../../services/cargo.service';

// Constants
const CACHE_TTL = 300000; // 5 minutes cache TTL
const MAX_RETRIES = 3;

// State interface
interface CargoState {
  manifests: {
    byId: Record<number, CargoManifest>;
    allIds: number[];
    loading: boolean;
    error: string | null;
    lastUpdated: number | null;
  };
  tracking: {
    byManifestId: Record<number, CargoTracking[]>;
    loading: boolean;
    error: string | null;
  };
  filters: {
    status?: CargoStatus;
    type?: CargoType;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  cache: {
    timestamp: number;
    invalidated: boolean;
  };
}

// Initial state
const initialState: CargoState = {
  manifests: {
    byId: {},
    allIds: [],
    loading: false,
    error: null,
    lastUpdated: null
  },
  tracking: {
    byManifestId: {},
    loading: false,
    error: null
  },
  filters: {},
  pagination: {
    page: 1,
    limit: 10,
    total: 0
  },
  cache: {
    timestamp: Date.now(),
    invalidated: false
  }
};

// Async thunks
export const fetchCargoManifest = createAsyncThunk(
  'cargo/fetchCargoManifest',
  async (id: number, { rejectWithValue, getState }) => {
    try {
      const cargoService = new CargoService();
      const manifest = await cargoService.getCargoManifest(id);
      return manifest;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCargoManifests = createAsyncThunk(
  'cargo/fetchCargoManifests',
  async (params: { 
    filters?: { status?: CargoStatus; type?: CargoType; dateRange?: { start: Date; end: Date } };
    page: number;
    limit: number;
  }, { rejectWithValue }) => {
    try {
      const cargoService = new CargoService();
      const response = await cargoService.getCargoManifests(
        params.filters || {},
        { page: params.page, limit: params.limit }
      );
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateCargoStatus = createAsyncThunk(
  'cargo/updateCargoStatus',
  async (params: { id: number; status: CargoStatus }, { rejectWithValue }) => {
    try {
      const cargoService = new CargoService();
      const updatedManifest = await cargoService.updateCargoStatus(params.id, params.status);
      return updatedManifest;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCargoTracking = createAsyncThunk(
  'cargo/fetchCargoTracking',
  async (manifestId: number, { rejectWithValue }) => {
    try {
      const cargoService = new CargoService();
      const tracking = await cargoService.getCargoTracking(manifestId);
      return { manifestId, tracking };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const cargoSlice = createSlice({
  name: 'cargo',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<typeof initialState.filters>) => {
      state.filters = action.payload;
      state.cache.invalidated = true;
    },
    resetFilters: (state) => {
      state.filters = {};
      state.cache.invalidated = true;
    },
    invalidateCache: (state) => {
      state.cache.invalidated = true;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchCargoManifest
      .addCase(fetchCargoManifest.pending, (state) => {
        state.manifests.loading = true;
        state.manifests.error = null;
      })
      .addCase(fetchCargoManifest.fulfilled, (state, action) => {
        state.manifests.loading = false;
        state.manifests.byId[action.payload.id] = action.payload;
        if (!state.manifests.allIds.includes(action.payload.id)) {
          state.manifests.allIds.push(action.payload.id);
        }
        state.manifests.lastUpdated = Date.now();
      })
      .addCase(fetchCargoManifest.rejected, (state, action) => {
        state.manifests.loading = false;
        state.manifests.error = action.payload as string;
      })
      // fetchCargoManifests
      .addCase(fetchCargoManifests.pending, (state) => {
        state.manifests.loading = true;
        state.manifests.error = null;
      })
      .addCase(fetchCargoManifests.fulfilled, (state, action) => {
        state.manifests.loading = false;
        state.manifests.byId = {};
        state.manifests.allIds = [];
        action.payload.data.forEach((manifest) => {
          state.manifests.byId[manifest.id] = manifest;
          state.manifests.allIds.push(manifest.id);
        });
        state.pagination.total = action.payload.total;
        state.manifests.lastUpdated = Date.now();
        state.cache.timestamp = Date.now();
        state.cache.invalidated = false;
      })
      .addCase(fetchCargoManifests.rejected, (state, action) => {
        state.manifests.loading = false;
        state.manifests.error = action.payload as string;
      })
      // updateCargoStatus
      .addCase(updateCargoStatus.fulfilled, (state, action) => {
        const manifest = action.payload;
        state.manifests.byId[manifest.id] = manifest;
        state.manifests.lastUpdated = Date.now();
      })
      // fetchCargoTracking
      .addCase(fetchCargoTracking.pending, (state) => {
        state.tracking.loading = true;
        state.tracking.error = null;
      })
      .addCase(fetchCargoTracking.fulfilled, (state, action) => {
        state.tracking.loading = false;
        state.tracking.byManifestId[action.payload.manifestId] = action.payload.tracking;
      })
      .addCase(fetchCargoTracking.rejected, (state, action) => {
        state.tracking.loading = false;
        state.tracking.error = action.payload as string;
      });
  }
});

// Selectors
export const selectCargoManifests = createSelector(
  [(state: { cargo: CargoState }) => state.cargo.manifests],
  (manifests) => manifests.allIds.map(id => manifests.byId[id])
);

export const selectCargoTracking = createSelector(
  [(state: { cargo: CargoState }) => state.cargo.tracking.byManifestId,
   (_: any, manifestId: number) => manifestId],
  (trackingByManifestId, manifestId) => trackingByManifestId[manifestId] || []
);

export const selectCargoStats = createSelector(
  [(state: { cargo: CargoState }) => state.cargo.manifests.byId],
  (manifests) => {
    const stats = {
      total: Object.keys(manifests).length,
      byStatus: {} as Record<CargoStatus, number>,
      byType: {} as Record<CargoType, number>
    };
    
    Object.values(manifests).forEach((manifest) => {
      stats.byStatus[manifest.status] = (stats.byStatus[manifest.status] || 0) + 1;
      stats.byType[manifest.cargoType] = (stats.byType[manifest.cargoType] || 0) + 1;
    });
    
    return stats;
  }
);

export const { setFilters, resetFilters, invalidateCache } = cargoSlice.actions;
export default cargoSlice.reducer;