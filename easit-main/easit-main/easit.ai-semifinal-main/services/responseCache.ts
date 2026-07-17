/**
 * EASIT.ai — Response Cache Service
 * 
 * LRU (Least Recently Used) cache for AI responses.
 * Prevents duplicate API calls for identical queries and provides
 * offline fallback for cached responses.
 */

import type { ConsensusResult } from './gcgoEngine';

interface CacheEntry {
  result: ConsensusResult;
  timestamp: number;
  accessCount: number;
}

const DEFAULT_MAX_SIZE = 50;
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

class ResponseCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttlMs: number;
  private inFlight: Map<string, Promise<ConsensusResult>>;

  constructor(maxSize = DEFAULT_MAX_SIZE, ttlMs = DEFAULT_TTL_MS) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.inFlight = new Map();
  }

  /**
   * Generate a cache key from query + search flag.
   * Normalizes whitespace and case for better hit rates.
   */
  private makeKey(query: string, searchEnabled: boolean): string {
    const normalized = query.trim().toLowerCase().replace(/\s+/g, ' ');
    return `${searchEnabled ? 's:' : 'n:'}${normalized}`;
  }

  /**
   * Check if a cached response exists and is still valid.
   */
  get(query: string, searchEnabled: boolean): ConsensusResult | null {
    const key = this.makeKey(query, searchEnabled);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    entry.accessCount++;
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.result;
  }

  /**
   * Store a response in the cache.
   */
  set(query: string, searchEnabled: boolean, result: ConsensusResult): void {
    const key = this.makeKey(query, searchEnabled);
    
    // Evict LRU if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * Deduplication: If an identical request is already in-flight,
   * return the existing promise instead of firing a new API call.
   */
  getInFlight(query: string, searchEnabled: boolean): Promise<ConsensusResult> | null {
    const key = this.makeKey(query, searchEnabled);
    return this.inFlight.get(key) || null;
  }

  setInFlight(query: string, searchEnabled: boolean, promise: Promise<ConsensusResult>): void {
    const key = this.makeKey(query, searchEnabled);
    this.inFlight.set(key, promise);
    
    // Auto-cleanup when resolved
    promise.finally(() => {
      this.inFlight.delete(key);
    });
  }

  /**
   * Clear all cached responses.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  stats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
    };
  }
}

// Singleton instance
export const responseCache = new ResponseCache();
