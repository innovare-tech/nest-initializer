import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import morgan from 'morgan';
import { RequestLoggerPlugin } from '../../src';

const mockMorganMiddleware = jest.fn(() => 'morgan_dev_middleware');
jest.mock('morgan', () => jest.fn(() => mockMorganMiddleware));

const mockedMorgan = morgan as unknown as jest.Mock;

describe('RequestLoggerPlugin', () => {
  let plugin: RequestLoggerPlugin;
  let mockApp: INestApplication;
  let mockAppUse: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAppUse = jest.fn();
    mockApp = {
      use: mockAppUse,
    } as unknown as INestApplication;

    plugin = new RequestLoggerPlugin();
  });

  it('should be defined', () => {
    expect(plugin).toBeDefined();
  });

  it('should call app.use once', () => {
    plugin.apply(mockApp);
    expect(mockAppUse).toHaveBeenCalledTimes(1);
  });

  it('should call morgan function once with "dev"', () => {
    plugin.apply(mockApp);
    expect(mockedMorgan).toHaveBeenCalledTimes(1);
    expect(mockedMorgan).toHaveBeenCalledWith('dev');
  });

  it('should call app.use with the result of morgan("dev")', () => {
    plugin.apply(mockApp);
    expect(mockAppUse).toHaveBeenCalledWith(mockMorganMiddleware);
  });
});
