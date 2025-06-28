export interface CacheConfig {
  enabled?: boolean;
  defaultTTL?: number;
  maxSize?: number;
  keyPrefix?: string;
  adapter?: CacheAdapter;
  compression?: boolean;
  serialize?: (data: any) => string;
  deserialize?: (data: string) => any;
}

export interface CacheAdapter {
  get(key: string): Promise<any> | any;
  set(key: string, value: any, ttl?: number): Promise<void> | void;
  delete(key: string): Promise<boolean> | boolean;
  clear(): Promise<void> | void;
  has(key: string): Promise<boolean> | boolean;
  keys(): Promise<string[]> | string[];
  size(): Promise<number> | number;
}

export interface CacheEntry {
  data: any;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
}

export interface CacheOptions {
  enabled?: boolean;
  ttl?: number;
  key?: string;
  invalidatePattern?: string;
  tags?: string[];
  serialize?: boolean;
  compress?: boolean;
}

export interface CacheEvents {
  'cache:hit': { key: string; data: any; entry: CacheEntry };
  'cache:miss': { key: string };
  'cache:set': { key: string; data: any; ttl: number };
  'cache:delete': { key: string };
  'cache:clear': {};
  'cache:expired': { key: string; entry: CacheEntry };
}