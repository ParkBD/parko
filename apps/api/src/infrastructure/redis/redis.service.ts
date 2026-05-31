import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Redis } from 'ioredis';

// Lua: atomically delete key only if value matches (prevents releasing someone else's lock)
const RELEASE_LOCK_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.redis.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.redis.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.redis.hgetall(key);
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.redis.hdel(key, field);
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    await this.redis.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.redis.smembers(key);
  }

  async srem(key: string, member: string): Promise<void> {
    await this.redis.srem(key, member);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.redis.publish(channel, message);
  }

  /**
   * Acquire a distributed lock. Returns a token to release with, or null if the
   * lock is already held. ttlMs is the maximum hold time — always release early.
   *
   * Pattern: SET key token NX PX ttlMs
   */
  async acquireLock(key: string, ttlMs: number): Promise<string | null> {
    const token = randomUUID();
    const result = await this.redis.set(key, token, 'PX', ttlMs, 'NX');
    return result === 'OK' ? token : null;
  }

  /**
   * Release a lock acquired with acquireLock. Uses a Lua CAS script so we
   * never delete a lock we don't own (e.g. after a timeout + re-acquisition).
   */
  async releaseLock(key: string, token: string): Promise<void> {
    await this.redis.eval(RELEASE_LOCK_SCRIPT, 1, key, token);
  }

  /**
   * Run fn while holding a distributed lock on key. Throws ConflictException if
   * lock cannot be acquired within the first attempt. Always releases on exit.
   */
  async withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const { ConflictException } = await import('@nestjs/common');
    const token = await this.acquireLock(key, ttlMs);
    if (!token) throw new ConflictException('Resource is locked — please retry');
    try {
      return await fn();
    } finally {
      await this.releaseLock(key, token);
    }
  }
}
