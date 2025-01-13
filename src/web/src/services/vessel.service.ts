// External imports with versions
import { Observable, Subject, BehaviorSubject, throwError, timer } from 'rxjs'; // ^7.8.0
import { catchError, retry, map, shareReplay, switchMap } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client'; // ^4.5.0

// Internal imports
import { ApiService } from './api.service';
import { IVessel, IVesselCall, VesselStatus, VesselCallStatus } from '../types/vessel.types';
import { endpoints, buildUrl } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class VesselService {
  private readonly baseUrl = endpoints.vessel.base;
  private socket: Socket;
  private vesselSubject = new BehaviorSubject<Map<number, IVessel>>(new Map());
  private vesselCallSubject = new BehaviorSubject<Map<number, IVesselCall>>(new Map());
  private readonly CACHE_TTL = 60000; // 1 minute cache TTL
  private readonly RETRY_CONFIG = { count: 3, delay: 1000 };

  constructor(private apiService: ApiService) {
    // Initialize WebSocket connection for real-time updates
    this.socket = io(`${process.env.SOCKET_URL}/vessels`, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    this.setupSocketListeners();
    this.setupCaching();
  }

  /**
   * Sets up WebSocket event listeners for real-time vessel updates
   */
  private setupSocketListeners(): void {
    this.socket.on('vessel:update', (vessel: IVessel) => {
      const vessels = this.vesselSubject.value;
      vessels.set(vessel.id, vessel);
      this.vesselSubject.next(vessels);
    });

    this.socket.on('vesselCall:update', (vesselCall: IVesselCall) => {
      const vesselCalls = this.vesselCallSubject.value;
      vesselCalls.set(vesselCall.id, vesselCall);
      this.vesselCallSubject.next(vesselCalls);
    });
  }

  /**
   * Configures caching strategy for API responses
   */
  private setupCaching(): void {
    this.apiService.setupCache({
      ttl: this.CACHE_TTL,
      maxSize: 1000,
      invalidationRules: {
        patterns: [this.baseUrl],
        dependencies: {
          [endpoints.vessel.getAll]: [endpoints.vessel.base],
          [endpoints.vessel.getById]: [endpoints.vessel.base]
        }
      }
    });
  }

  /**
   * Retrieves all vessels with caching and real-time updates
   */
  public getVessels(): Observable<IVessel[]> {
    return this.apiService.get<IVessel[]>(endpoints.vessel.getAll)
      .pipe(
        retry(this.RETRY_CONFIG.count),
        map(vessels => {
          const vesselMap = new Map(vessels.map(v => [v.id, v]));
          this.vesselSubject.next(vesselMap);
          return vessels;
        }),
        catchError(error => this.handleError('Failed to fetch vessels', error)),
        shareReplay(1)
      );
  }

  /**
   * Retrieves a specific vessel by ID with real-time updates
   */
  public getVesselById(id: number): Observable<IVessel> {
    const url = buildUrl(endpoints.vessel.getById, { id });
    return this.apiService.get<IVessel>(url)
      .pipe(
        retry(this.RETRY_CONFIG.count),
        map(vessel => {
          const vessels = this.vesselSubject.value;
          vessels.set(vessel.id, vessel);
          this.vesselSubject.next(vessels);
          return vessel;
        }),
        catchError(error => this.handleError(`Failed to fetch vessel ${id}`, error))
      );
  }

  /**
   * Creates a new vessel record
   */
  public createVessel(vessel: Partial<IVessel>): Observable<IVessel> {
    return this.apiService.post<IVessel>(endpoints.vessel.create, vessel)
      .pipe(
        map(newVessel => {
          const vessels = this.vesselSubject.value;
          vessels.set(newVessel.id, newVessel);
          this.vesselSubject.next(vessels);
          return newVessel;
        }),
        catchError(error => this.handleError('Failed to create vessel', error))
      );
  }

  /**
   * Updates an existing vessel record
   */
  public updateVessel(id: number, vessel: Partial<IVessel>): Observable<IVessel> {
    const url = buildUrl(endpoints.vessel.update, { id });
    return this.apiService.put<IVessel>(url, vessel)
      .pipe(
        map(updatedVessel => {
          const vessels = this.vesselSubject.value;
          vessels.set(updatedVessel.id, updatedVessel);
          this.vesselSubject.next(vessels);
          return updatedVessel;
        }),
        catchError(error => this.handleError(`Failed to update vessel ${id}`, error))
      );
  }

  /**
   * Retrieves all vessel calls with real-time updates
   */
  public getVesselCalls(): Observable<IVesselCall[]> {
    return this.apiService.get<IVesselCall[]>(`${this.baseUrl}/calls`)
      .pipe(
        retry(this.RETRY_CONFIG.count),
        map(calls => {
          const callMap = new Map(calls.map(c => [c.id, c]));
          this.vesselCallSubject.next(callMap);
          return calls;
        }),
        catchError(error => this.handleError('Failed to fetch vessel calls', error)),
        shareReplay(1)
      );
  }

  /**
   * Retrieves a specific vessel call by ID with real-time updates
   */
  public getVesselCallById(id: number): Observable<IVesselCall> {
    return this.apiService.get<IVesselCall>(`${this.baseUrl}/calls/${id}`)
      .pipe(
        retry(this.RETRY_CONFIG.count),
        map(call => {
          const calls = this.vesselCallSubject.value;
          calls.set(call.id, call);
          this.vesselCallSubject.next(calls);
          return call;
        }),
        catchError(error => this.handleError(`Failed to fetch vessel call ${id}`, error))
      );
  }

  /**
   * Creates a new vessel call record
   */
  public createVesselCall(vesselCall: Partial<IVesselCall>): Observable<IVesselCall> {
    return this.apiService.post<IVesselCall>(`${this.baseUrl}/calls`, vesselCall)
      .pipe(
        map(newCall => {
          const calls = this.vesselCallSubject.value;
          calls.set(newCall.id, newCall);
          this.vesselCallSubject.next(calls);
          return newCall;
        }),
        catchError(error => this.handleError('Failed to create vessel call', error))
      );
  }

  /**
   * Updates the status of a vessel call
   */
  public updateVesselCallStatus(
    id: number, 
    status: VesselCallStatus
  ): Observable<IVesselCall> {
    return this.apiService.put<IVesselCall>(
      `${this.baseUrl}/calls/${id}/status`,
      { status }
    ).pipe(
      map(updatedCall => {
        const calls = this.vesselCallSubject.value;
        calls.set(updatedCall.id, updatedCall);
        this.vesselCallSubject.next(calls);
        return updatedCall;
      }),
      catchError(error => this.handleError(`Failed to update vessel call status ${id}`, error))
    );
  }

  /**
   * Handles API errors in a consistent way
   */
  private handleError(message: string, error: any): Observable<never> {
    console.error(message, error);
    return throwError(() => new Error(`${message}: ${error.message}`));
  }

  /**
   * Cleanup method to be called on service destruction
   */
  public ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.vesselSubject.complete();
    this.vesselCallSubject.complete();
  }
}