/**
 * Comprehensive set of possible cargo status values for tracking throughout the cargo lifecycle
 * @version 1.0.0
 */
export enum CargoStatus {
    REGISTERED = 'REGISTERED',
    IN_TRANSIT = 'IN_TRANSIT',
    ARRIVED = 'ARRIVED',
    CUSTOMS_HOLD = 'CUSTOMS_HOLD',
    CUSTOMS_CLEARED = 'CUSTOMS_CLEARED',
    IN_STORAGE = 'IN_STORAGE',
    IN_TRANSPORT = 'IN_TRANSPORT',
    DELIVERED = 'DELIVERED'
}

/**
 * Comprehensive types of cargo handled by the port system including specialized categories
 * @version 1.0.0
 */
export enum CargoType {
    CONTAINER = 'CONTAINER',
    BULK_DRY = 'BULK_DRY',
    BULK_LIQUID = 'BULK_LIQUID',
    BREAKBULK = 'BREAKBULK',
    RORO = 'RORO',
    DANGEROUS = 'DANGEROUS'
}

/**
 * Transport details for cargo movement
 */
export interface TransportDetails {
    mode: string;
    carrier: string;
    vehicleId?: string;
    estimatedDeparture?: Date;
    estimatedArrival?: Date;
    actualDeparture?: Date;
    actualArrival?: Date;
    route?: string;
    status: string;
}

/**
 * Comprehensive structure of cargo manifest data including customs, storage, and transport details
 * @version 1.0.0
 */
export interface CargoManifest {
    id: number;
    vesselCallId: number;
    cargoType: CargoType;
    weight: number;
    volume: number;
    consigneeId: number;
    status: CargoStatus;
    location: string;
    documentReference: string;
    customsStatus: string;
    customsDeclarationNumber: string;
    dangerousGoodsClass: string | null;
    storageLocation: string | null;
    transportDetails: TransportDetails;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Structure for real-time cargo tracking events with detailed status updates and audit information
 * @version 1.0.0
 */
export interface CargoTracking {
    id: number;
    cargoManifestId: number;
    status: CargoStatus;
    location: string;
    timestamp: Date;
    updatedBy: string;
    notes: string | null;
    eventType: string;
}