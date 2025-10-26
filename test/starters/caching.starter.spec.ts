import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

import {
  CachingStarterOptions,
  createCachingStarter,
} from '../../src/starters/caching.starter';

jest.mock('cache-manager-redis-store', () => ({
  redisStore: jest.fn(),
}));

const mockedRedisStore = redisStore as jest.Mock;

jest.mock('@nestjs/cache-manager', () => ({
  CacheModule: {
    registerAsync: jest.fn((options) => ({
      __dynamicModule: true,
      options,
    })),
  },
}));

describe('createCachingStarter', () => {
  let mockConfigService: ConfigService;
  let options: CachingStarterOptions;
  const mockStoreInstance = { store: 'mockRedisStoreInstance' };

  beforeEach(() => {
    jest.clearAllMocks();

    mockedRedisStore.mockResolvedValue(mockStoreInstance);

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'REDIS_URL') return 'redis://default:6379';
        if (key === 'CUSTOM_REDIS_URL') return 'redis://custom:6380';
        return undefined;
      }),
    } as unknown as ConfigService;

    options = {};
  });

  it('should return a dynamic module configured correctly with default options', async () => {
    const result = createCachingStarter();
    expect(result).toHaveProperty('__dynamicModule', true);
    const registerAsyncOptions = (result as any).options;

    expect(registerAsyncOptions.isGlobal).toBe(true);
    expect(registerAsyncOptions.imports).toEqual([]);
    expect(registerAsyncOptions.inject).toEqual([ConfigService]);
    expect(registerAsyncOptions.useFactory).toBeInstanceOf(Function);

    const factoryResult =
      await registerAsyncOptions.useFactory(mockConfigService);

    expect(mockedRedisStore).toHaveBeenCalledTimes(1);
    expect(mockedRedisStore).toHaveBeenCalledWith({
      url: 'redis://default:6379',
    });
    expect(mockConfigService.get).toHaveBeenCalledWith('REDIS_URL');

    expect(factoryResult).toHaveProperty('ttl', 300);
    expect(factoryResult).toHaveProperty('store');
    expect(typeof factoryResult.store).toBe('function');
    expect(factoryResult.store()).toBe(mockStoreInstance);
  });

  it('should use custom redisUrlEnvKey when provided', async () => {
    options.redisUrlEnvKey = 'CUSTOM_REDIS_URL';
    const result = createCachingStarter(options);
    const registerAsyncOptions = (result as any).options;
    await registerAsyncOptions.useFactory(mockConfigService);

    expect(mockConfigService.get).toHaveBeenCalledWith('CUSTOM_REDIS_URL');
    expect(mockedRedisStore).toHaveBeenCalledWith({
      url: 'redis://custom:6380',
    });
  });

  it('should use custom defaultTtlInSeconds when provided', async () => {
    options.defaultTtlInSeconds = 600;
    const result = createCachingStarter(options);
    const registerAsyncOptions = (result as any).options;
    const factoryResult =
      await registerAsyncOptions.useFactory(mockConfigService);

    expect(factoryResult.ttl).toBe(600);
  });

  it('should pass inject and imports correctly to registerAsync', () => {
    createCachingStarter();
    expect(CacheModule.registerAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        isGlobal: true,
        imports: [],
        inject: [ConfigService],
        useFactory: expect.any(Function),
      }),
    );
  });
});
