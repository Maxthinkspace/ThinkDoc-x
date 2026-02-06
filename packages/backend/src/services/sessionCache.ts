/**
 * Session Cache Service
 * 
 * Caches full documents per session to avoid re-sending on every request.
 * 
 * Limitations:
 * - In-memory only (not shared across server instances)
 * - For horizontal scaling, replace with Redis implementation
 */

import { logger } from '@/config/logger';

interface CachedSession {
  userId: string;
  fullDocument: string;
  createdAt: number;
  lastAccessedAt: number;
  sizeBytes: number;
}

interface SessionCacheConfig {
  /** TTL in milliseconds (default: 30 minutes) */
  ttlMs: number;
  /** Cleanup interval in milliseconds (default: 5 minutes) */
  cleanupIntervalMs: number;
  /** Max total cache size in bytes (default: 500MB) */
  maxCacheSizeBytes: number;
  /** Max single document size in bytes (default: 10MB) */
  maxDocumentSizeBytes: number;
  /** Max sessions per user (default: 5) */
  maxSessionsPerUser: number;
}

const DEFAULT_CONFIG: SessionCacheConfig = {
  ttlMs: 30 * 60 * 1000,           // 30 minutes
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
  maxCacheSizeBytes: 500 * 1024 * 1024,  // 500MB
  maxDocumentSizeBytes: 10 * 1024 * 1024, // 10MB
  maxSessionsPerUser: 5,
};

class SessionCacheService {
  private cache: Map<string, CachedSession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private config: SessionCacheConfig;
  private totalSizeBytes: number = 0;

  constructor(config: Partial<SessionCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * Store document for a session
   */
  set(sessionId: string, userId: string, fullDocument: string): boolean {
    const sizeBytes = Buffer.byteLength(fullDocument, 'utf8');

    // Validate document size
    if (sizeBytes > this.config.maxDocumentSizeBytes) {
      logger.warn(
        { sessionId, userId, sizeBytes, maxSize: this.config.maxDocumentSizeBytes },
        'Session cache: document exceeds max size, not caching'
      );
      return false;
    }

    // Evict if needed to make room
    this.evictIfNeeded(sizeBytes, userId);

    // Enforce per-user session limit
    this.enforceUserSessionLimit(userId);

    // Remove old entry if exists (to update size tracking)
    const existing = this.cache.get(sessionId);
    if (existing) {
      this.totalSizeBytes -= existing.sizeBytes;
    }

    const now = Date.now();
    this.cache.set(sessionId, {
      userId,
      fullDocument,
      createdAt: now,
      lastAccessedAt: now,
      sizeBytes,
    });
    this.totalSizeBytes += sizeBytes;

    logger.debug(
      { sessionId, userId, sizeBytes, totalCacheSize: this.totalSizeBytes },
      'Session cache: stored document'
    );

    return true;
  }

  /**
   * Get document for a session (validates user ownership)
   */
  get(sessionId: string, userId: string): string | null {
    const session = this.cache.get(sessionId);
    if (!session) {
      return null;
    }

    // Validate user ownership
    if (session.userId !== userId) {
      logger.warn(
        { sessionId, requestingUserId: userId, ownerUserId: session.userId },
        'Session cache: user mismatch, denying access'
      );
      return null;
    }

    // Update last accessed time
    session.lastAccessedAt = Date.now();
    return session.fullDocument;
  }

  /**
   * Check if session exists and belongs to user
   */
  has(sessionId: string, userId: string): boolean {
    const session = this.cache.get(sessionId);
    return session !== null && session !== undefined && session.userId === userId;
  }

  /**
   * Delete a session
   */
  delete(sessionId: string): void {
    const session = this.cache.get(sessionId);
    if (session) {
      this.totalSizeBytes -= session.sizeBytes;
      this.cache.delete(sessionId);
    }
  }

  /**
   * Get or set: returns cached document, or stores and returns new one
   */
  getOrSet(sessionId: string, userId: string, fullDocument?: string): string | null {
    const cached = this.get(sessionId, userId);
    if (cached) {
      return cached;
    }

    if (fullDocument) {
      const stored = this.set(sessionId, userId, fullDocument);
      return stored ? fullDocument : null;
    }

    return null;
  }

  /**
   * Evict oldest sessions if cache is too large
   */
  private evictIfNeeded(incomingSizeBytes: number, excludeUserId?: string): void {
    if (this.totalSizeBytes + incomingSizeBytes <= this.config.maxCacheSizeBytes) {
      return;
    }

    // Sort by lastAccessedAt (oldest first) for LRU eviction
    const entries = Array.from(this.cache.entries())
      .filter(([, session]) => session.userId !== excludeUserId) // Don't evict current user's sessions
      .sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);

    let evicted = 0;
    for (const [sessionId, session] of entries) {
      if (this.totalSizeBytes + incomingSizeBytes <= this.config.maxCacheSizeBytes) {
        break;
      }
      this.delete(sessionId);
      evicted++;
    }

    if (evicted > 0) {
      logger.info(
        { evicted, totalCacheSize: this.totalSizeBytes },
        'Session cache: evicted sessions due to size limit'
      );
    }
  }

  /**
   * Enforce max sessions per user
   */
  private enforceUserSessionLimit(userId: string): void {
    const userSessions = Array.from(this.cache.entries())
      .filter(([, session]) => session.userId === userId)
      .sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);

    while (userSessions.length >= this.config.maxSessionsPerUser) {
      const oldest = userSessions.shift();
      if (oldest) {
        this.delete(oldest[0]);
        logger.debug(
          { sessionId: oldest[0], userId },
          'Session cache: evicted oldest session for user (limit reached)'
        );
      }
    }
  }

  /**
   * Cleanup expired sessions
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.cache.entries()) {
      if (now - session.lastAccessedAt > this.config.ttlMs) {
        this.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(
        { cleaned, remaining: this.cache.size, totalSizeBytes: this.totalSizeBytes },
        'Session cache: TTL cleanup complete'
      );
    }
  }

  private startCleanup(): void {
    // Clear any existing interval (handles HMR in development)
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cleanupInterval = setInterval(() => this.cleanup(), this.config.cleanupIntervalMs);
    
    // Ensure interval doesn't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * For graceful shutdown
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get cache stats (for monitoring/health checks)
   */
  getStats(): {
    sessionCount: number;
    totalSizeBytes: number;
    totalSizeMB: number;
    oldestAgeMs: number | null;
    config: SessionCacheConfig;
  } {
    let oldestAgeMs: number | null = null;
    const now = Date.now();

    for (const session of this.cache.values()) {
      const age = now - session.createdAt;
      if (oldestAgeMs === null || age > oldestAgeMs) {
        oldestAgeMs = age;
      }
    }

    return {
      sessionCount: this.cache.size,
      totalSizeBytes: this.totalSizeBytes,
      totalSizeMB: Math.round(this.totalSizeBytes / (1024 * 1024) * 100) / 100,
      oldestAgeMs,
      config: this.config,
    };
  }
}

// Singleton with environment-based config
function buildConfig(): Partial<SessionCacheConfig> {
  const config: Partial<SessionCacheConfig> = {};
  
  const ttlMs = parseInt(process.env.SESSION_CACHE_TTL_MS || '', 10);
  if (!isNaN(ttlMs) && ttlMs > 0) {
    config.ttlMs = ttlMs;
  }
  
  const maxCacheSizeBytes = parseInt(process.env.SESSION_CACHE_MAX_SIZE_BYTES || '', 10);
  if (!isNaN(maxCacheSizeBytes) && maxCacheSizeBytes > 0) {
    config.maxCacheSizeBytes = maxCacheSizeBytes;
  }
  
  return config;
}

export const sessionCache = new SessionCacheService(buildConfig());