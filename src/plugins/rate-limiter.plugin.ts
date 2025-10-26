import { INestApplication } from '@nestjs/common';
import rateLimit, { Options as RateLimitOptions } from 'express-rate-limit';

import { AppInitializerPlugin } from '../core';

export class RateLimiterPlugin implements AppInitializerPlugin {
  private readonly options: RateLimitOptions;

  constructor(options: Partial<RateLimitOptions> = {}) {
    const finalOptions = {
      windowMs: 15 * 60 * 1000,
      limit: 100,
      statusCode: 429,
      message:
        'Too many requests from this IP, please try again after 15 minutes',
      standardHeaders: true,
      legacyHeaders: false,
      ...options,
    };

    this.options = finalOptions as RateLimitOptions;
  }

  apply(app: INestApplication): void {
    app.use(rateLimit(this.options));
  }
}
