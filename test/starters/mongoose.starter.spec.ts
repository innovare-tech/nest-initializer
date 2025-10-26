import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  createMongooseStarter,
  MongooseStarterOptions,
} from '../../src/starters';

jest.mock('@nestjs/mongoose', () => ({
  MongooseModule: {
    forRootAsync: jest.fn(),
  },
}));

const mockedForRootAsync = MongooseModule.forRootAsync as jest.Mock;

describe('createMongooseStarter', () => {
  let mockConfigService: ConfigService;
  let options: MongooseStarterOptions;

  beforeEach(() => {
    mockedForRootAsync.mockClear();
    jest.clearAllMocks();

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'MONGO_URI') return 'mongodb://default:pass@host/db';
        if (key === 'CUSTOM_MONGO_URI') return 'mongodb://custom:pass@host/db';
        return undefined;
      }),
    } as unknown as ConfigService;

    options = {};
  });

  it('should call forRootAsync with correct default options', () => {
    createMongooseStarter();

    expect(mockedForRootAsync).toHaveBeenCalledTimes(1);
    const receivedOptions = mockedForRootAsync.mock.calls[0][0];

    expect(receivedOptions.imports).toEqual([]);
    expect(receivedOptions.inject).toEqual([ConfigService]);
    expect(receivedOptions.useFactory).toBeInstanceOf(Function);

    const factory = receivedOptions.useFactory;
    const factoryResult = factory(mockConfigService);
    expect(factoryResult).toEqual({
      uri: 'mongodb://default:pass@host/db',
    });
    expect(mockConfigService.get).toHaveBeenCalledWith('MONGO_URI');
  });

  it('should use custom uriEnvKey when provided', () => {
    options.uriEnvKey = 'CUSTOM_MONGO_URI';
    createMongooseStarter(options);

    expect(mockedForRootAsync).toHaveBeenCalledTimes(1);
    const receivedOptions = mockedForRootAsync.mock.calls[0][0];
    const factory = receivedOptions.useFactory;
    const factoryResult = factory(mockConfigService);

    expect(factoryResult.uri).toBe('mongodb://custom:pass@host/db');
    expect(mockConfigService.get).toHaveBeenCalledWith('CUSTOM_MONGO_URI');
  });

  it('should merge custom mongooseOptions correctly', () => {
    options.mongooseOptions = {
      retryAttempts: 5,
    };
    createMongooseStarter(options);

    expect(mockedForRootAsync).toHaveBeenCalledTimes(1);
    const receivedOptions = mockedForRootAsync.mock.calls[0][0];

    const factory = receivedOptions.useFactory;
    const factoryResult = factory(mockConfigService);

    expect(factoryResult).toEqual({
      uri: 'mongodb://default:pass@host/db',
      retryAttempts: 5,
    });
  });

  it('should pass inject and imports correctly to forRootAsync', () => {
    createMongooseStarter();
    expect(mockedForRootAsync).toHaveBeenCalledTimes(1);
    const receivedOptions = mockedForRootAsync.mock.calls[0][0];

    expect(receivedOptions.imports).toEqual([]);
    expect(receivedOptions.inject).toEqual([ConfigService]);
    expect(receivedOptions.useFactory).toBeInstanceOf(Function);
  });
});
