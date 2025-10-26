import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { METRICS_HTTP_HISTOGRAM } from './metrics.tokens';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @Inject(METRICS_HTTP_HISTOGRAM)
    private readonly histogram: Histogram,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const end = this.histogram.startTimer();

    return next.handle().pipe(
      finalize(() => {
        const path = request.route?.path ?? request.path;

        end({
          method: request.method,
          path: path,
          status_code: response.statusCode,
        });
      }),
    );
  }
}
