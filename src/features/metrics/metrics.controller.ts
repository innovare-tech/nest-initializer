import { Controller, Get, Inject, Res } from '@nestjs/common';
import { Registry } from 'prom-client';

import { METRICS_REGISTRY } from './metrics.tokens';

@Controller('metrics')
export class MetricsController {
  constructor(
    @Inject(METRICS_REGISTRY)
    private readonly registry: Registry,
  ) {}

  @Get()
  async getMetrics(@Res() res: any) {
    res.header('Content-Type', this.registry.contentType);
    res.send(await this.registry.metrics());
  }
}
