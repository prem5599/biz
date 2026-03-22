/**
 * Redis Client Configuration
 *
 * Provides a singleton Redis client for use throughout the application.
 * Used for caching, session storage, and as the backend for Bull Queue.
 */

import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

/**
 * Get or create a Redis client instance
 * Implements singleton pattern to ensure only one connection
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  // Create new Redis client
  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => {
        // Exponential backoff with max 3 seconds
        const delay = Math.min(retries * 100, 3000);
        console.log(`Redis reconnecting in ${delay}ms (attempt ${retries})...`);
        return delay;
      },
    },
  });

  // Error handling
  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis Client Connected');
  });

  redisClient.on('ready', () => {
    console.log('Redis Client Ready');
  });

  redisClient.on('reconnecting', () => {
    console.log('Redis Client Reconnecting...');
  });

  redisClient.on('end', () => {
    console.log('Redis Client Disconnected');
  });

  // Connect to Redis
  await redisClient.connect();

  return redisClient;
}

/**
 * Close Redis connection
 * Should be called during application shutdown
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis Client Closed');
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    console.error('Redis not available:', error);
    return false;
  }
}

/**
 * Cache helper functions
 */
export class RedisCache {
  /**
   * Get value from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const client = await getRedisClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with optional expiration
   */
  static async set(key: string, value: any, expirationSeconds?: number): Promise<boolean> {
    try {
      const client = await getRedisClient();
      const serialized = JSON.stringify(value);

      if (expirationSeconds) {
        await client.setEx(key, expirationSeconds, serialized);
      } else {
        await client.set(key, serialized);
      }

      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  static async del(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient();
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  /**
   * Delete keys matching pattern
   */
  static async delPattern(pattern: string): Promise<number> {
    try {
      const client = await getRedisClient();
      const keys = await client.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      await client.del(keys);
      return keys.length;
    } catch (error) {
      console.error('Redis delPattern error:', error);
      return 0;
    }
  }
}

export default redisClient;
