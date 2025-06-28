import { 
  CacheConfig, 
  CacheAdapter, 
  CacheEntry, 
  CacheStats, 
  CacheOptions 
} from '../types/cache';
import { CacheError } from '../errors';

export class CacheManager {
  private config: Required<CacheConfig>;
  private adapter: CacheAdapter;
  private stats: CacheStats;

  constructor(config: CacheConfig = {}) {
    this.config = {
      enabled: true,
      defaultTTL: 300000, // 5 minutes
      maxSize: 1000,
      keyPrefix: 'api_cache_',
      adapter: undefined as any,
      compression: false,
      serialize: JSON.stringify,
      deserialize: JSON.parse,
      ...config
    };

    this.adapter = this.config.adapter ?? new MemoryCacheAdapter(this.config.maxSize);
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      hitRate: 0
    };
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.config.enabled) return null;

    try {
      const cacheKey = this.buildKey(key);
      const entry = await this.adapter.get(cacheKey);

      if (!entry) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      if (this.isExpired(entry)) {
        await this.delete(key);
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      entry.hits++;
      await this.adapter.set(cacheKey, entry);
      
      this.stats.hits++;
      this.updateHitRate();

      return this.deserializeData(entry.data);
    } catch (error) {
      throw new CacheError(`Failed to get cache entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async set<T = any>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const cacheKey = this.buildKey(key);
      const ttl = options.ttl ?? this.config.defaultTTL;
      const now = Date.now();

      const entry: CacheEntry = {
        data: this.serializeData(data),
        expiresAt: now + ttl,
        createdAt: now,
        hits: 0
      };

      await this.adapter.set(cacheKey, entry);
      
      this.stats.sets++;
      this.stats.size = await this.adapter.size();
    } catch (error) {
      throw new CacheError(`Failed to set cache entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.config.enabled) return false;

    try {
      const cacheKey = this.buildKey(key);
      const deleted = await this.adapter.delete(cacheKey);
      
      if (deleted) {
        this.stats.deletes++;
        this.stats.size = await this.adapter.size();
      }
      
      return deleted;
    } catch (error) {
      throw new CacheError(`Failed to delete cache entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clear(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      await this.adapter.clear();
      this.stats.size = 0;
    } catch (error) {
      throw new CacheError(`Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.config.enabled) return false;

    try {
      const cacheKey = this.buildKey(key);
      const exists = await this.adapter.has(cacheKey);
      
      if (!exists) return false;

      const entry = await this.adapter.get(cacheKey);
      if (!entry || this.isExpired(entry)) {
        await this.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.config.enabled) return 0;

    try {
      const keys = await this.adapter.keys();
      const regex = new RegExp(pattern);
      let deletedCount = 0;

      for (const key of keys) {
        if (regex.test(key)) {
          const deleted = await this.adapter.delete(key);
          if (deleted) deletedCount++;
        }
      }

      if (deletedCount > 0) {
        this.stats.size = await this.adapter.size();
      }

      return deletedCount;
    } catch (error) {
      throw new CacheError(`Failed to invalidate pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async invalidateTags(_tags: string[]): Promise<number> {
    // Implementation would require storing tag metadata with entries
    // For now, return 0 as this is an advanced feature
    return 0;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  async cleanup(): Promise<number> {
    if (!this.config.enabled) return 0;

    try {
      const keys = await this.adapter.keys();
      let cleanedCount = 0;

      for (const key of keys) {
        const entry = await this.adapter.get(key);
        if (entry && this.isExpired(entry)) {
          await this.adapter.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.stats.size = await this.adapter.size();
      }

      return cleanedCount;
    } catch (error) {
      throw new CacheError(`Failed to cleanup cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  buildCacheKey(url: string, method: string, params?: any, body?: any): string {
    const parts = [method.toUpperCase(), url];
    
    if (params && Object.keys(params).length > 0) {
      const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');
      parts.push(`params:${sortedParams}`);
    }

    if (body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      parts.push(`body:${bodyStr}`);
    }

    return parts.join('|');
  }

  private buildKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  private serializeData(data: any): any {
    if (!this.config.compression) {
      return this.config.serialize(data);
    }
    
    // Basic compression could be added here
    return this.config.serialize(data);
  }

  private deserializeData(data: any): any {
    if (typeof data === 'string') {
      return this.config.deserialize(data);
    }
    return data;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

class MemoryCacheAdapter implements CacheAdapter {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): CacheEntry | null {
    return this.cache.get(key) || null;
  }

  set(key: string, value: CacheEntry): void {
    // Simple LRU: if at capacity, remove oldest entry
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  size(): number {
    return this.cache.size;
  }
}