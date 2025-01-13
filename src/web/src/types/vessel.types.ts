/**
 * Enum representing possible operational statuses of a vessel
 * Used for tracking vessel availability and maintenance state
 */
export enum VesselStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE'
}

/**
 * Enum representing possible states of a vessel call within the port
 * Tracks the complete lifecycle of a vessel visit from scheduling to departure
 */
export enum VesselCallStatus {
  SCHEDULED = 'SCHEDULED',
  APPROACHING = 'APPROACHING',
  BERTHED = 'BERTHED',
  DEPARTED = 'DEPARTED',
  CANCELLED = 'CANCELLED'
}

/**
 * Interface defining the structure of vessel data
 * Matches database schema with frontend-specific type safety
 */
export interface IVessel {
  /** Unique identifier for the vessel */
  id: number;
  
  /** IMO number - unique vessel identifier per IMO standards */
  imoNumber: string;
  
  /** Vessel name */
  name: string;
  
  /** Type of vessel (e.g., Container, Bulk Carrier, etc.) */
  type: string;
  
  /** Flag state of the vessel */
  flag: string;
  
  /** Length overall (LOA) in meters */
  length: number;
  
  /** Beam/width in meters */
  width: number;
  
  /** Maximum draft in meters */
  maxDraft: number;
  
  /** Vessel owner/operator */
  owner: string;
  
  /** Current operational status */
  status: VesselStatus;
  
  /** Record creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Interface defining the structure of a vessel call
 * Represents a single visit of a vessel to the port
 */
export interface IVesselCall {
  /** Unique identifier for the vessel call */
  id: number;
  
  /** Reference to the port where call is scheduled */
  portId: number;
  
  /** Reference to the vessel making the call */
  vesselId: number;
  
  /** Vessel call sign for port communications */
  callSign: string;
  
  /** Current status of the vessel call */
  status: VesselCallStatus;
  
  /** Estimated Time of Arrival */
  eta: Date;
  
  /** Estimated Time of Departure */
  etd: Date;
  
  /** Actual Time of Arrival (null if not arrived) */
  ata: Date | null;
  
  /** Actual Time of Departure (null if not departed) */
  atd: Date | null;
  
  /** Vessel name for display purposes */
  vesselName: string;
  
  /** IMO number for vessel identification */
  imoNumber: string;
  
  /** Record creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
}