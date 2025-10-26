import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmMigrationPlugin } from '../../src';
import {
  createTypeOrmStarter,
  TypeOrmStarterOptions,
} from '../../src/starters';

jest.mock('@nestjs/typeorm', () => ({
  TypeOrmModule: {
    forRootAsync: jest.fn((options) => ({
      __dynamicModule: true,
      options,
    })),
  },
}));

jest.mock('../../src/plugins/typeorm-migration.plugin');

describe('createTypeOrmStarter', () => {
  let mockConfigService: ConfigService;
  let options: TypeOrmStarterOptions;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'DATABASE_URL') return 'postgres://default:pass@host/db';
        if (key === 'CUSTOM_DB_URL') return 'mysql://custom:pass@host/db';
        return undefined;
      }),
    } as unknown as ConfigService;

    options = {};
  });

  it('should return a dynamic module and empty plugins array with default options', () => {
    const result = createTypeOrmStarter();

    expect(result.plugins).toEqual([]);
    expect(result.module).toHaveProperty('__dynamicModule', true);

    const forRootAsyncOptions = (result.module as any).options;
    expect(forRootAsyncOptions.inject).toEqual([ConfigService]);
    expect(forRootAsyncOptions.imports).toEqual([]);

    const factoryResult = forRootAsyncOptions.useFactory(mockConfigService);
    expect(factoryResult).toEqual({
      url: 'postgres://default:pass@host/db',
      autoLoadEntities: true,
      synchronize: false,
    });
    expect(mockConfigService.get).toHaveBeenCalledWith('DATABASE_URL');
  });

  it('should include TypeOrmMigrationPlugin when runMigrationsOnStartup is true', () => {
    options.runMigrationsOnStartup = true;
    const result = createTypeOrmStarter(options);

    expect(result.plugins).toHaveLength(1);
    expect(result.plugins[0]).toBeInstanceOf(TypeOrmMigrationPlugin);
    expect(TypeOrmMigrationPlugin).toHaveBeenCalledTimes(1);
  });

  it('should use custom databaseUrlEnvKey when provided', () => {
    options.databaseUrlEnvKey = 'CUSTOM_DB_URL';
    const result = createTypeOrmStarter(options);
    const factoryResult = (result.module as any).options.useFactory(
      mockConfigService,
    );

    expect(factoryResult.url).toBe('mysql://custom:pass@host/db');
    expect(mockConfigService.get).toHaveBeenCalledWith('CUSTOM_DB_URL');
  });

  it('should set autoLoadEntities to false when provided', () => {
    options.autoLoadEntities = false;
    const result = createTypeOrmStarter(options);
    const factoryResult = (result.module as any).options.useFactory(
      mockConfigService,
    );

    expect(factoryResult.autoLoadEntities).toBe(false);
  });

  it('should merge custom typeOrmOptions correctly', () => {
    options.typeOrmOptions = {
      type: 'mysql',
      logging: true,
    };
    const result = createTypeOrmStarter(options);
    const factoryResult = (result.module as any).options.useFactory(
      mockConfigService,
    );

    expect(factoryResult).toEqual({
      url: 'postgres://default:pass@host/db',
      autoLoadEntities: true,
      synchronize: false,
      type: 'mysql',
      logging: true,
    });
  });

  it('should pass inject and imports correctly to forRootAsync', () => {
    createTypeOrmStarter();

    expect(TypeOrmModule.forRootAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        imports: [],
        inject: [ConfigService],
        useFactory: expect.any(Function),
      }),
    );
  });
});
