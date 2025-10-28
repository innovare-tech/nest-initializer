import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

export type ResponseMapper<T> = (data: any, context: ExecutionContext) => T;

export class ResponsePatternInterceptor implements NestInterceptor {
  constructor(private readonly mapper: ResponseMapper<any>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.mapper(data, context)));
  }
}
