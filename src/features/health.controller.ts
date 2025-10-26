import { Controller, Get, Inject, Optional } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorFunction,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

import * as terminusHealthCheckModule from './terminus-health-check.module';

export const HEALTH_CHECK_OPTIONS = 'HEALTH_CHECK_OPTIONS';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(HEALTH_CHECK_OPTIONS)
    private readonly options: terminusHealthCheckModule.TerminusHealthCheckOptions,
    private readonly health: HealthCheckService,
    @Optional()
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const checks: HealthIndicatorFunction[] = [];

    if (this.options.database && this.db) {
      checks.push(() => this.db.pingCheck('database'));
    }

    if (this.options.memory) {
      const { heapThreshold = 200, rssThreshold = 300 } = this.options.memory;
      checks.push(() =>
        this.memory.checkHeap('memory_heap', heapThreshold * 1024 * 1024),
      );
      checks.push(() =>
        this.memory.checkRSS('memory_rss', rssThreshold * 1024 * 1024),
      );
    }

    return this.health.check(checks);
  }
}
