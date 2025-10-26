import { INestApplication } from '@nestjs/common';
import morgan from 'morgan';

import { AppInitializerPlugin } from '../core';

export class RequestLoggerPlugin implements AppInitializerPlugin {
  apply(app: INestApplication): void {
    app.use(morgan('dev'));
  }
}
