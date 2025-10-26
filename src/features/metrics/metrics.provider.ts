import { Provider } from '@nestjs/common';
import { collectDefaultMetrics, Histogram, Registry } from 'prom-client';

import { METRICS_HTTP_HISTOGRAM, METRICS_REGISTRY } from './metrics.tokens';

export const metricsProviders: Provider[] = [
  {
    provide: METRICS_REGISTRY,
    useFactory: () => {
      const registry = new Registry();
      collectDefaultMetrics({ register: registry });
      return registry;
    },
  },
  {
    provide: METRICS_HTTP_HISTOGRAM,
    useFactory: (registry: Registry) => {
      const histogram = new Histogram({
        name: 'http_requests_duration_seconds',
        help: 'Duração das requisições HTTP em segundos',
        labelNames: ['method', 'path', 'status_code'],
        buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10], // Buckets em segundos
      });
      registry.registerMetric(histogram);
      return histogram;
    },
    inject: [METRICS_REGISTRY],
  },
];
