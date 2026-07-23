import { createClient } from 'redis';

interface CacheProvider {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

class MemoryCache implements CacheProvider {
  private store = new Map<string, { value: string; expiry: number | null }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiry && item.expiry < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

class RedisCache implements CacheProvider {
  private client: ReturnType<typeof createClient>;
  private isConnected = false;
  private fallback = new MemoryCache();

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = createClient({ url: redisUrl });

    this.client.on('error', (err) => {
      if (this.isConnected) {
        console.warn('Redis error, falling back to Memory Cache:', err.message);
      }
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis server');
      this.isConnected = true;
    });

    this.client.connect().catch((err) => {
      console.warn('Redis connection failed. Using Memory Cache instead.', err.message);
      this.isConnected = false;
    });
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) return this.fallback.get(key);
    try {
      return await this.client.get(key);
    } catch {
      return this.fallback.get(key);
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) {
      await this.fallback.set(key, value, ttlSeconds);
      return;
    }
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, { EX: ttlSeconds });
      } else {
        await this.client.set(key, value);
      }
    } catch {
      await this.fallback.set(key, value, ttlSeconds);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) {
      await this.fallback.del(key);
      return;
    }
    try {
      await this.client.del(key);
    } catch {
      await this.fallback.del(key);
    }
  }
}

// Export a singleton cache instance
const cache = new RedisCache();
export default cache;
