import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;
  constructor(private configService: ConfigService) {}
  onModuleInit() {
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD', ''),
    });

    this.redisClient.on('connect', () => {
      console.log('✅ Connected to Redis');
    });

    this.redisClient.on('error', (err) => {
      console.error('❌ Redis Error:', err);
    });
  }

  async set(key: string, value: string, expiryInSeconds?: number) {
    await this.redisClient.set(key, value);
    if (expiryInSeconds) {
      await this.redisClient.expire(key, expiryInSeconds);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async delete(key: string) {
    await this.redisClient.del(key);
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }
}
