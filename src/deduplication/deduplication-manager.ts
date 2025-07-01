import { Logger } from '../logging/logger';
import { DeduplicationConfig, PendingRequest, DeduplicationStats } from './types';

export class DeduplicationManager {
  private enabled: boolean;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private keyGenerator: (method: string, url: string, data?: any, params?: any) => string;
  private timeout: number;
  private logger?: Logger;
  private cleanupInterval?: NodeJS.Timeout;
  private stats: DeduplicationStats = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    activeRequests: 0,
    deduplicationRate: 0
  };

  constructor(config: DeduplicationConfig = { enabled: true }, logger?: Logger) {
    this.enabled = config.enabled ?? true;
    this.timeout = config.timeout ?? 30000; // 30 segundos por defecto
    this.logger = logger;
    
    // Generador de keys por defecto
    this.keyGenerator = config.keyGenerator || this.defaultKeyGenerator;
    
    // Limpiar peticiones expiradas cada 30 segundos
    if (this.enabled) {
      this.cleanupInterval = setInterval(() => this.cleanupExpiredRequests(), 30000);
    }
  }

  private defaultKeyGenerator(method: string, url: string, data?: any, params?: any): string {
    const baseKey = `${method.toUpperCase()}:${url}`;
    
    // Incluir parámetros en la key si existen
    const paramsString = params ? JSON.stringify(params) : '';
    const dataString = data ? JSON.stringify(data) : '';
    
    return `${baseKey}:${paramsString}:${dataString}`;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async executeRequest<T>(
    method: string,
    url: string,
    requestExecutor: () => Promise<T>,
    data?: any,
    params?: any
  ): Promise<T> {
    if (!this.enabled) {
      return requestExecutor();
    }

    const key = this.keyGenerator(method, url, data, params);
    this.stats.totalRequests++;
    
    this.logger?.debug('Request stats after increment', { 
      key,
      totalRequests: this.stats.totalRequests,
      deduplicatedRequests: this.stats.deduplicatedRequests
    });

    // Verificar si ya hay una petición en progreso con la misma key
    const existingRequest = this.pendingRequests.get(key);
    
    if (existingRequest) {
      this.stats.deduplicatedRequests++;
      this.updateDeduplicationRate();
      
      this.logger?.debug('Request deduplicated, stats updated', { 
        key,
        totalRequests: this.stats.totalRequests,
        deduplicatedRequests: this.stats.deduplicatedRequests,
        deduplicationRate: this.stats.deduplicationRate
      });
      
      this.logger?.debug('Request deduplicated', { 
        key, 
        method, 
        url,
        activeRequests: this.pendingRequests.size 
      });
      
      // Retornar la promesa existente
      return existingRequest.promise as Promise<T>;
    }

    // Crear AbortController para poder cancelar la petición si es necesario
    const abortController = new AbortController();
    
    // Crear nueva petición
    const promise = this.createManagedRequest(requestExecutor, abortController);
    
    // Almacenar la petición pendiente
    const pendingRequest: PendingRequest<T> = {
      promise,
      timestamp: Date.now(),
      abortController
    };
    
    this.pendingRequests.set(key, pendingRequest);
    this.stats.activeRequests = this.pendingRequests.size;
    
    this.logger?.debug('New request created', { 
      key, 
      method, 
      url,
      activeRequests: this.pendingRequests.size 
    });

    // Limpiar cuando la petición termine (exitosa o con error)
    promise.finally(() => {
      this.pendingRequests.delete(key);
      this.stats.activeRequests = this.pendingRequests.size;
      
      this.logger?.debug('Request completed and removed', { 
        key, 
        activeRequests: this.pendingRequests.size 
      });
    });

    return promise;
  }

  private async createManagedRequest<T>(
    requestExecutor: () => Promise<T>,
    abortController: AbortController
  ): Promise<T> {
    try {
      // Ejecutar la petición original
      const result = await requestExecutor();
      return result;
    } catch (error) {
      // Si la petición fue cancelada, lanzar un error específico
      if (abortController.signal.aborted) {
        throw new Error('Request was cancelled due to deduplication');
      }
      // Re-lanzar el error original
      throw error;
    }
  }

  private cleanupExpiredRequests(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.timeout) {
        // Cancelar la petición
        request.abortController.abort();
        this.pendingRequests.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.stats.activeRequests = this.pendingRequests.size;
      this.logger?.debug('Cleaned up expired requests', { 
        cleanedCount,
        activeRequests: this.pendingRequests.size 
      });
    }
  }

  private updateDeduplicationRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.deduplicationRate = (this.stats.deduplicatedRequests / this.stats.totalRequests) * 100;
    }
  }

  getStats(): DeduplicationStats {
    return { ...this.stats };
  }

  clear(): void {
    // Cancelar todas las peticiones pendientes
    for (const request of this.pendingRequests.values()) {
      request.abortController.abort();
    }
    
    this.pendingRequests.clear();
    this.stats.activeRequests = 0;
    
    // Limpiar el interval si existe
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    
    this.logger?.debug('All pending requests cleared');
  }

  getPendingRequestsCount(): number {
    return this.pendingRequests.size;
  }

  hasPendingRequest(method: string, url: string, data?: any, params?: any): boolean {
    const key = this.keyGenerator(method, url, data, params);
    return this.pendingRequests.has(key);
  }
}