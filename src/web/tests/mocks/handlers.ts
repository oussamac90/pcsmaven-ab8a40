import { rest } from 'msw';
import { HttpResponse } from 'msw';
import { 
  mockVessels, 
  mockVesselCalls, 
  mockCargoManifests, 
  mockDocuments 
} from './data';

// API base URL
const BASE_URL = '/api/v1';

// Vessel-related handlers
const vesselHandlers = [
  // Get all vessels
  rest.get(`${BASE_URL}/vessels`, (req) => {
    return HttpResponse.json(mockVessels, { status: 200 });
  }),

  // Get vessel by ID
  rest.get(`${BASE_URL}/vessels/:id`, (req) => {
    const { id } = req.params;
    const vessel = mockVessels.find(v => v.id === Number(id));
    
    if (!vessel) {
      return new HttpResponse(null, {
        status: 404,
        statusText: 'Vessel not found'
      });
    }
    
    return HttpResponse.json(vessel, { status: 200 });
  }),

  // Get vessel calls
  rest.get(`${BASE_URL}/vessel-calls`, (req) => {
    const status = req.url.searchParams.get('status');
    let filteredCalls = mockVesselCalls;
    
    if (status) {
      filteredCalls = mockVesselCalls.filter(call => call.status === status);
    }
    
    return HttpResponse.json(filteredCalls, { status: 200 });
  }),

  // Create vessel call
  rest.post(`${BASE_URL}/vessel-calls`, async (req) => {
    const body = await req.json();
    
    if (!body.vesselId || !body.eta || !body.etd) {
      return new HttpResponse(null, {
        status: 400,
        statusText: 'Missing required fields'
      });
    }
    
    const newCall = {
      id: mockVesselCalls.length + 1,
      ...body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return HttpResponse.json(newCall, { status: 201 });
  }),

  // Update vessel call status
  rest.patch(`${BASE_URL}/vessel-calls/:id/status`, async (req) => {
    const { id } = req.params;
    const body = await req.json();
    
    const call = mockVesselCalls.find(c => c.id === Number(id));
    if (!call) {
      return new HttpResponse(null, {
        status: 404,
        statusText: 'Vessel call not found'
      });
    }
    
    const updatedCall = {
      ...call,
      status: body.status,
      updatedAt: new Date()
    };
    
    return HttpResponse.json(updatedCall, { status: 200 });
  })
];

// Document-related handlers
const documentHandlers = [
  // Get all documents
  rest.get(`${BASE_URL}/documents`, (req) => {
    const type = req.url.searchParams.get('type');
    let filteredDocs = mockDocuments;
    
    if (type) {
      filteredDocs = mockDocuments.filter(doc => doc.documentType === type);
    }
    
    return HttpResponse.json(filteredDocs, { status: 200 });
  }),

  // Get document by ID
  rest.get(`${BASE_URL}/documents/:id`, (req) => {
    const { id } = req.params;
    const document = mockDocuments.find(d => d.id === id);
    
    if (!document) {
      return new HttpResponse(null, {
        status: 404,
        statusText: 'Document not found'
      });
    }
    
    return HttpResponse.json(document, { status: 200 });
  }),

  // Submit new document
  rest.post(`${BASE_URL}/documents`, async (req) => {
    const body = await req.json();
    
    if (!body.documentType || !body.content) {
      return new HttpResponse(null, {
        status: 400,
        statusText: 'Missing required fields'
      });
    }
    
    const newDoc = {
      id: `DOC-${Date.now()}`,
      ...body,
      status: 'SUBMITTED',
      createdAt: new Date(),
      updatedAt: new Date(),
      validationResult: {
        isValid: true,
        errors: [],
        warnings: [],
        validatedAt: new Date(),
        validatedBy: 'system'
      }
    };
    
    return HttpResponse.json(newDoc, { status: 201 });
  })
];

// Cargo-related handlers
const cargoHandlers = [
  // Get all cargo manifests
  rest.get(`${BASE_URL}/cargo-manifests`, (req) => {
    const status = req.url.searchParams.get('status');
    let filteredManifests = mockCargoManifests;
    
    if (status) {
      filteredManifests = mockCargoManifests.filter(m => m.status === status);
    }
    
    return HttpResponse.json(filteredManifests, { status: 200 });
  }),

  // Get cargo manifest by ID
  rest.get(`${BASE_URL}/cargo-manifests/:id`, (req) => {
    const { id } = req.params;
    const manifest = mockCargoManifests.find(m => m.id === Number(id));
    
    if (!manifest) {
      return new HttpResponse(null, {
        status: 404,
        statusText: 'Cargo manifest not found'
      });
    }
    
    return HttpResponse.json(manifest, { status: 200 });
  }),

  // Update cargo status
  rest.patch(`${BASE_URL}/cargo-manifests/:id/status`, async (req) => {
    const { id } = req.params;
    const body = await req.json();
    
    const manifest = mockCargoManifests.find(m => m.id === Number(id));
    if (!manifest) {
      return new HttpResponse(null, {
        status: 404,
        statusText: 'Cargo manifest not found'
      });
    }
    
    const updatedManifest = {
      ...manifest,
      status: body.status,
      updatedAt: new Date()
    };
    
    return HttpResponse.json(updatedManifest, { status: 200 });
  }),

  // Track cargo
  rest.get(`${BASE_URL}/cargo-tracking/:manifestId`, (req) => {
    const { manifestId } = req.params;
    const manifest = mockCargoManifests.find(m => m.id === Number(manifestId));
    
    if (!manifest) {
      return new HttpResponse(null, {
        status: 404,
        statusText: 'Cargo manifest not found'
      });
    }
    
    const tracking = {
      id: Number(manifestId),
      cargoManifestId: Number(manifestId),
      status: manifest.status,
      location: manifest.location,
      timestamp: new Date(),
      updatedBy: 'system',
      notes: null,
      eventType: 'STATUS_UPDATE'
    };
    
    return HttpResponse.json(tracking, { status: 200 });
  })
];

// Combine all handlers
export const handlers = [
  ...vesselHandlers,
  ...documentHandlers,
  ...cargoHandlers
];