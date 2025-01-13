// External imports with versions
import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5

// Internal imports
import { IVessel, IVesselCall, VesselCallStatus } from '../../types/vessel.types';
import { VesselService } from '../../services/vessel.service';

// Initialize vessel service
const vesselService = new VesselService();

// Interface for vessel state
interface VesselState {
  vessels: IVessel[];
  vesselCalls: IVesselCall[];
  loading: boolean;
  error: string | null;
  selectedVessel: IVessel | null;
  selectedVesselCall: IVesselCall | null;
  socketConnected: boolean;
  lastUpdated: Date | null;
  pendingUpdates: { id: number; status: VesselCallStatus }[];
  cacheValidity: number;
}

// Initial state
const initialState: VesselState = {
  vessels: [],
  vesselCalls: [],
  loading: false,
  error: null,
  selectedVessel: null,
  selectedVesselCall: null,
  socketConnected: false,
  lastUpdated: null,
  pendingUpdates: [],
  cacheValidity: 300000 // 5 minutes cache validity
};

// Async thunks
export const fetchVessels = createAsyncThunk(
  'vessel/fetchVessels',
  async ({ forceRefresh = false }: { forceRefresh?: boolean }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { vessel: VesselState };
      const now = new Date();
      const lastUpdate = state.vessel.lastUpdated;

      // Return cached data if valid and not forcing refresh
      if (!forceRefresh && lastUpdate && 
          (now.getTime() - lastUpdate.getTime()) < state.vessel.cacheValidity) {
        return state.vessel.vessels;
      }

      const vessels = await vesselService.getVessels().toPromise();
      return vessels;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchVesselCalls = createAsyncThunk(
  'vessel/fetchVesselCalls',
  async ({ filters, forceRefresh = false }: { filters: any; forceRefresh?: boolean }, 
        { getState, rejectWithValue }) => {
    try {
      const state = getState() as { vessel: VesselState };
      const now = new Date();
      const lastUpdate = state.vessel.lastUpdated;

      // Return cached data if valid and not forcing refresh
      if (!forceRefresh && lastUpdate && 
          (now.getTime() - lastUpdate.getTime()) < state.vessel.cacheValidity) {
        return state.vessel.vesselCalls;
      }

      const vesselCalls = await vesselService.getVesselCalls().toPromise();
      return vesselCalls;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateVesselCallStatus = createAsyncThunk(
  'vessel/updateVesselCallStatus',
  async ({ id, status }: { id: number; status: VesselCallStatus }, 
        { dispatch, rejectWithValue }) => {
    try {
      // Optimistic update
      dispatch(vesselSlice.actions.addPendingUpdate({ id, status }));
      
      const updatedCall = await vesselService.updateVesselCallStatus(id, status).toPromise();
      return updatedCall;
    } catch (error) {
      // Revert optimistic update on error
      dispatch(vesselSlice.actions.removePendingUpdate(id));
      return rejectWithValue((error as Error).message);
    }
  }
);

// Create the slice
const vesselSlice = createSlice({
  name: 'vessel',
  initialState,
  reducers: {
    setSelectedVessel: (state, action: PayloadAction<IVessel | null>) => {
      state.selectedVessel = action.payload;
    },
    setSelectedVesselCall: (state, action: PayloadAction<IVesselCall | null>) => {
      state.selectedVesselCall = action.payload;
    },
    setSocketConnected: (state, action: PayloadAction<boolean>) => {
      state.socketConnected = action.payload;
    },
    addPendingUpdate: (state, action: PayloadAction<{ id: number; status: VesselCallStatus }>) => {
      state.pendingUpdates.push(action.payload);
    },
    removePendingUpdate: (state, action: PayloadAction<number>) => {
      state.pendingUpdates = state.pendingUpdates.filter(update => update.id !== action.payload);
    },
    handleWebSocketUpdate: (state, action: PayloadAction<IVesselCall>) => {
      const index = state.vesselCalls.findIndex(call => call.id === action.payload.id);
      if (index !== -1) {
        state.vesselCalls[index] = action.payload;
      }
      state.lastUpdated = new Date();
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch vessels reducers
      .addCase(fetchVessels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVessels.fulfilled, (state, action) => {
        state.vessels = action.payload;
        state.loading = false;
        state.lastUpdated = new Date();
      })
      .addCase(fetchVessels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch vessel calls reducers
      .addCase(fetchVesselCalls.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVesselCalls.fulfilled, (state, action) => {
        state.vesselCalls = action.payload;
        state.loading = false;
        state.lastUpdated = new Date();
      })
      .addCase(fetchVesselCalls.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update vessel call status reducers
      .addCase(updateVesselCallStatus.fulfilled, (state, action) => {
        const index = state.vesselCalls.findIndex(call => call.id === action.payload.id);
        if (index !== -1) {
          state.vesselCalls[index] = action.payload;
        }
        state.pendingUpdates = state.pendingUpdates.filter(update => update.id !== action.payload.id);
        state.lastUpdated = new Date();
      });
  }
});

// Selectors
export const selectVessels = (state: { vessel: VesselState }) => state.vessel.vessels;
export const selectVesselCalls = (state: { vessel: VesselState }) => state.vessel.vesselCalls;

export const selectActiveVessels = createSelector(
  [selectVesselCalls],
  (vesselCalls) => vesselCalls.filter(call => 
    call.status === VesselCallStatus.APPROACHING || 
    call.status === VesselCallStatus.BERTHED
  )
);

// Export actions and reducer
export const { 
  setSelectedVessel, 
  setSelectedVesselCall, 
  setSocketConnected,
  handleWebSocketUpdate 
} = vesselSlice.actions;

export default vesselSlice.reducer;