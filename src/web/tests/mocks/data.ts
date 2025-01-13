import { 
  VesselStatus, 
  VesselCallStatus, 
  IVessel, 
  IVesselCall 
} from '../src/types/vessel.types';

import {
  CargoStatus,
  CargoType,
  CargoManifest,
  CargoTracking
} from '../src/types/cargo.types';

import {
  Document,
  DocumentType,
  DocumentStatus,
  DocumentValidationResult,
  DocumentFormat,
  ValidationSeverity
} from '../src/types/document.types';

// Base date for generating consistent test data
export const MOCK_DATE = new Date('2024-01-01T00:00:00Z');

// Mock Vessels Data
export const mockVessels: IVessel[] = [
  {
    id: 1,
    imoNumber: "9876543",
    name: "MSC OSCAR",
    type: "Container Ship",
    flag: "Panama",
    length: 400,
    width: 59,
    maxDraft: 16,
    owner: "Mediterranean Shipping Company",
    status: VesselStatus.ACTIVE,
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE
  },
  {
    id: 2,
    imoNumber: "9876544",
    name: "MAERSK TRIPLE E",
    type: "Container Ship",
    flag: "Denmark",
    length: 399,
    width: 59,
    maxDraft: 16,
    owner: "Maersk Line",
    status: VesselStatus.ACTIVE,
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE
  },
  {
    id: 3,
    imoNumber: "9876545",
    name: "BULK CARRIER ONE",
    type: "Bulk Carrier",
    flag: "Liberia",
    length: 225,
    width: 32,
    maxDraft: 14,
    owner: "Star Bulk Carriers",
    status: VesselStatus.MAINTENANCE,
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE
  }
];

// Mock Vessel Calls Data
export const mockVesselCalls: IVesselCall[] = [
  {
    id: 1,
    portId: 1,
    vesselId: 1,
    callSign: "MSCO1",
    status: VesselCallStatus.SCHEDULED,
    eta: new Date(MOCK_DATE.getTime() + 86400000), // +1 day
    etd: new Date(MOCK_DATE.getTime() + 172800000), // +2 days
    ata: null,
    atd: null,
    vesselName: "MSC OSCAR",
    imoNumber: "9876543",
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE
  },
  {
    id: 2,
    portId: 1,
    vesselId: 2,
    callSign: "MAER1",
    status: VesselCallStatus.BERTHED,
    eta: new Date(MOCK_DATE.getTime() - 86400000), // -1 day
    etd: new Date(MOCK_DATE.getTime() + 86400000), // +1 day
    ata: new Date(MOCK_DATE.getTime() - 86400000), // -1 day
    atd: null,
    vesselName: "MAERSK TRIPLE E",
    imoNumber: "9876544",
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE
  }
];

// Mock Cargo Manifests Data
export const mockCargoManifests: CargoManifest[] = [
  {
    id: 1,
    vesselCallId: 1,
    cargoType: CargoType.CONTAINER,
    weight: 25000,
    volume: 1250,
    consigneeId: 1,
    status: CargoStatus.REGISTERED,
    location: "TERMINAL A",
    documentReference: "MAN-2024-001",
    customsStatus: "PENDING",
    customsDeclarationNumber: "CD-2024-001",
    dangerousGoodsClass: null,
    storageLocation: "A12-B34",
    transportDetails: {
      mode: "TRUCK",
      carrier: "FastFreight Ltd",
      vehicleId: "TRK-001",
      estimatedDeparture: new Date(MOCK_DATE.getTime() + 259200000), // +3 days
      estimatedArrival: new Date(MOCK_DATE.getTime() + 345600000), // +4 days
      status: "SCHEDULED"
    },
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE
  },
  {
    id: 2,
    vesselCallId: 1,
    cargoType: CargoType.DANGEROUS,
    weight: 15000,
    volume: 750,
    consigneeId: 2,
    status: CargoStatus.CUSTOMS_HOLD,
    location: "TERMINAL B",
    documentReference: "MAN-2024-002",
    customsStatus: "INSPECTION_REQUIRED",
    customsDeclarationNumber: "CD-2024-002",
    dangerousGoodsClass: "CLASS 3",
    storageLocation: "DG-Zone-1",
    transportDetails: {
      mode: "RAIL",
      carrier: "RailCargo Express",
      vehicleId: "RC-002",
      estimatedDeparture: new Date(MOCK_DATE.getTime() + 432000000), // +5 days
      estimatedArrival: new Date(MOCK_DATE.getTime() + 518400000), // +6 days
      status: "PENDING"
    },
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE
  }
];

// Mock Documents Data
export const mockDocuments: Document[] = [
  {
    id: "DOC-2024-001",
    documentType: DocumentType.CARGO_MANIFEST,
    title: "Cargo Manifest - MSC OSCAR",
    content: "Detailed cargo manifest content...",
    status: DocumentStatus.VALIDATED,
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE,
    submittedBy: "operator@msc.com",
    metadata: {
      version: "1.0",
      format: DocumentFormat.JSON,
      sender: "MSC Operations",
      receiver: "Port Authority",
      references: [
        {
          type: "VESSEL_CALL",
          id: "VC-2024-001",
          description: "MSC OSCAR Port Call"
        }
      ]
    },
    validationResult: {
      isValid: true,
      errors: [],
      warnings: [],
      validatedAt: MOCK_DATE,
      validatedBy: "system"
    }
  },
  {
    id: "DOC-2024-002",
    documentType: DocumentType.DANGEROUS_GOODS,
    title: "Dangerous Goods Declaration",
    content: "Dangerous goods declaration content...",
    status: DocumentStatus.PROCESSING,
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE,
    submittedBy: "safety@msc.com",
    metadata: {
      version: "1.0",
      format: DocumentFormat.PDF,
      sender: "MSC Safety Department",
      receiver: "Port Authority",
      references: [
        {
          type: "CARGO_MANIFEST",
          id: "MAN-2024-002",
          description: "Related Cargo Manifest"
        }
      ]
    },
    validationResult: {
      isValid: false,
      errors: [
        {
          code: "DG-001",
          message: "Missing hazard class specification",
          location: "Section 2.1",
          severity: ValidationSeverity.ERROR,
          context: {
            field: "hazardClass",
            required: true
          }
        }
      ],
      warnings: [
        {
          code: "DG-W001",
          message: "Recommended additional safety measures",
          location: "Section 4.2",
          context: {
            recommendation: "Consider special handling procedures"
          }
        }
      ],
      validatedAt: MOCK_DATE,
      validatedBy: "system"
    }
  }
];