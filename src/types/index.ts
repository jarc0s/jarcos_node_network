export * from './config';
export * from './auth';
export * from './cache';
export * from './retry';
export * from './logging';
export * from './api';
export * from '../deduplication/types';

export interface EventEmitter {
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  once(event: string, listener: (...args: any[]) => void): void;
  removeAllListeners(event?: string): void;
}