import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Module } from '@nestjs/common';
import { Provider } from '@nestjs/common/interfaces/modules/provider.interface';
import {
  MemoryHealthIndicator,
  TerminusModule,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

import { HEALTH_CHECK_OPTIONS, HealthController } from './health.controller';

export interface TerminusHealthCheckOptions {
  database?: boolean;
  memory?: {
    heapThreshold?: number;
    rssThreshold?: number;
  };
}

@Module({})
export class TerminusHealthCheckModule {
  static forRoot(options: TerminusHealthCheckOptions): DynamicModule {
    const providers: Provider[] = [];

    if (options.database) {
      providers.push(TypeOrmHealthIndicator);
    }

    const optionsProvider = {
      provide: HEALTH_CHECK_OPTIONS,
      useValue: options,
    };

    providers.push(optionsProvider);
    providers.push(MemoryHealthIndicator);

    return {
      module: TerminusHealthCheckModule,
      imports: [TerminusModule, HttpModule],
      controllers: [HealthController],
      providers: providers,
      exports: [],
    };
  }
}
