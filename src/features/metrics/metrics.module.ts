import { DynamicModule, Module, Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { metricsProviders } from './metrics.provider';
import { METRICS_HTTP_HISTOGRAM, METRICS_REGISTRY } from './metrics.tokens';

@Module({})
export class MetricsModule {
  static forRoot(): DynamicModule {
    const providers: Provider[] = [
      ...metricsProviders,
      MetricsInterceptor,
      {
        provide: APP_INTERCEPTOR,
        useClass: MetricsInterceptor,
      },
    ];

    return {
      module: MetricsModule,
      controllers: [MetricsController],
      providers: providers,

      exports: [METRICS_REGISTRY, METRICS_HTTP_HISTOGRAM],
    };
  }
}
