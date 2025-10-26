import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import rateLimit, { Options as RateLimitOptions } from 'express-rate-limit';
import { RateLimiterPlugin } from '../../src';

const mockRateLimitMiddleware = jest.fn(() => 'rate_limit_middleware_instance');
jest.mock('express-rate-limit', () => ({
  __esModule: true,
  default: jest.fn(() => mockRateLimitMiddleware),
}));

const mockedRateLimit = rateLimit as unknown as jest.Mock;

describe('RateLimiterPlugin', () => {
  let mockApp: INestApplication;
  let mockAppUse: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAppUse = jest.fn();
    mockApp = {
      use: mockAppUse,
    } as unknown as INestApplication;
  });

  it('should be defined', () => {
    const plugin = new RateLimiterPlugin();
    expect(plugin).toBeDefined();
  });

  it('should initialize with default options if none are provided', () => {
    const plugin = new RateLimiterPlugin();
    const expectedDefaults: Partial<RateLimitOptions> = {
      windowMs: 15 * 60 * 1000,
      limit: 100,
      statusCode: 429,
      message:
        'Too many requests from this IP, please try again after 15 minutes',
      standardHeaders: true,
      legacyHeaders: false,
    };
    expect(plugin['options']).toEqual(
      expect.objectContaining(expectedDefaults),
    );
  });

  it('should override default options with provided options', () => {
    const customOptions: Partial<RateLimitOptions> = {
      windowMs: 10 * 60 * 1000,
      limit: 50,
      message: 'Custom rate limit message',
    };
    const plugin = new RateLimiterPlugin(customOptions);

    const expectedMerged: Partial<RateLimitOptions> = {
      windowMs: 10 * 60 * 1000,
      limit: 50,
      statusCode: 429,
      message: 'Custom rate limit message',
      standardHeaders: true,
      legacyHeaders: false,
    };
    expect(plugin['options']).toEqual(expect.objectContaining(expectedMerged));
  });

  it('should call app.use once in apply method', () => {
    const plugin = new RateLimiterPlugin();
    plugin.apply(mockApp);
    expect(mockAppUse).toHaveBeenCalledTimes(1);
  });

  it('should call rateLimit function with stored options', () => {
    const customOptions: Partial<RateLimitOptions> = { limit: 75 };
    const plugin = new RateLimiterPlugin(customOptions);
    plugin.apply(mockApp);

    expect(mockedRateLimit).toHaveBeenCalledTimes(1);
    expect(mockedRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        windowMs: 15 * 60 * 1000,
        limit: 75,
        statusCode: 429,
        message: expect.any(String),
        standardHeaders: true,
        legacyHeaders: false,
      }),
    );
  });

  it('should call app.use with the result of the rateLimit function', () => {
    const plugin = new RateLimiterPlugin();
    plugin.apply(mockApp);

    expect(mockAppUse).toHaveBeenCalledWith(mockRateLimitMiddleware);
  });
});
