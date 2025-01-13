// External imports with versions
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'; // v1.3.4
import axiosRetry from 'axios-retry'; // v3.4.0
import CircuitBreaker from 'circuit-breaker-js'; // v0.0.3
import { SHA256, enc } from 'crypto-js'; // v4.1.1

// Internal imports
import { apiConfig, ApiEndpoints } from '../config/api.config';
import { AuthResponse } from '../types/auth.types';

// Enhanced API error interface
export interface ApiError {
  status: number;
  message: string;
  code: string;
  correlationId: string;
  timestamp: Date;
  details?: Record<string, any>;
}

// Enhanced retry configuration interface
export interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition: (error: any) => boolean;
  backoffFactor: number;
  maxRetryDelay: number;
}

// Cache configuration interface
export interface CacheConfig {
  ttl: number;
  maxSize: number;
  invalidationRules: {
    patterns: string[];
    dependencies: Record<string, string[]>;
  };
}

export class ApiService {
  private axiosInstance: AxiosInstance;
  private circuitBreaker: any;
  private cache: Map<string, { data: any; timestamp: number }>;
  private requestQueue: Array<() => Promise<any>>;
  private rateLimitWindow: number;
  private requestCount: number;

  constructor() {
    // Initialize axios instance with enhanced configuration
    this.axiosInstance = axios.create({
      baseURL: apiConfig.baseURL,
      timeout: apiConfig.timeout,
      headers: {
        ...apiConfig.headers,
        'X-Client-Timestamp': new Date().toISOString()
      }
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      windowDuration: 10000, // 10 second window
      numBuckets: 10,
      timeoutDuration: 30000,
      errorThreshold: 50,
      volumeThreshold: 10
    });

    // Initialize cache and request queue
    this.cache = new Map();
    this.requestQueue = [];
    this.rateLimitWindow = 1000; // 1 second window
    this.requestCount = 0;

    // Configure enhanced retry logic
    axiosRetry(this.axiosInstance, {
      retries: 3,
      retryDelay: (retryCount) => {
        return Math.min(1000 * Math.pow(2, retryCount), 10000);
      },
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               error.response?.status === 429;
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add correlation ID
        config.headers['X-Correlation-ID'] = this.generateCorrelationId();

        // Add request timing
        config.metadata = { startTime: performance.now() };

        // Add request signing
        const signature = this.signRequest(config);
        config.headers['X-Request-Signature'] = signature;

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Calculate request duration
        const duration = performance.now() - response.config.metadata.startTime;
        
        // Log performance metrics if enabled
        if (apiConfig.monitoring.enabled && Math.random() < apiConfig.monitoring.sampleRate) {
          this.logPerformanceMetrics(response.config.url!, duration);
        }

        return response;
      },
      (error) => {
        // Transform error to standard format
        const apiError: ApiError = {
          status: error.response?.status || 500,
          message: error.response?.data?.message || 'An unexpected error occurred',
          code: error.response?.data?.code || 'UNKNOWN_ERROR',
          correlationId: error.config?.headers['X-Correlation-ID'],
          timestamp: new Date(),
          details: error.response?.data?.details
        };

        return Promise.reject(apiError);
      }
    );
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private signRequest(config: AxiosRequestConfig): string {
    const timestamp = new Date().toISOString();
    const payload = `${config.method}${config.url}${timestamp}`;
    return SHA256(payload).toString(enc.Hex);
  }

  private async executeWithCircuitBreaker<T>(
    request: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.circuitBreaker.run(
        async () => {
          try {
            const result = await request();
            return resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        (err: Error) => reject(err)
      );
    });
  }

  private getCacheKey(url: string, params?: any): string {
    return `${url}${params ? JSON.stringify(params) : ''}`;
  }

  private logPerformanceMetrics(url: string, duration: number): void {
    // Log to monitoring system or console
    console.info(`API Request Performance: ${url} - ${duration}ms`);
  }

  // Public API methods
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const cacheKey = this.getCacheKey(url, config?.params);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute TTL
      return cached.data;
    }

    return this.executeWithCircuitBreaker(async () => {
      const response = await this.axiosInstance.get<T>(url, config);
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
      return response.data;
    });
  }

  public async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.executeWithCircuitBreaker(async () => {
      const response = await this.axiosInstance.post<T>(url, data, config);
      return response.data;
    });
  }

  public async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.executeWithCircuitBreaker(async () => {
      const response = await this.axiosInstance.put<T>(url, data, config);
      return response.data;
    });
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithCircuitBreaker(async () => {
      const response = await this.axiosInstance.delete<T>(url, config);
      return response.data;
    });
  }

  // Authentication helper methods
  public setAuthToken(token: string): void {
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  }

  public clearAuthToken(): void {
    delete this.axiosInstance.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
}

// Export singleton instance
export default new ApiService();