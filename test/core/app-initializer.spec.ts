import 'reflect-metadata';
import {
  CanActivate,
  ClassSerializerInterceptor,
  ExceptionFilter,
  INestApplication,
  Logger,
  Module,
  NestInterceptor,
  PipeTransform,
  ValidationPipe,
  ValidationPipeOptions,
  ValueProvider,
  VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  AbstractHttpAdapter,
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
  APP_PIPE,
  NestFactory,
  Reflector,
} from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  AppInitializer,
  AppInitializerPlugin,
  CachingStarterOptions,
  MongooseStarterOptions,
  RateLimiterPlugin,
  RequestLoggerPlugin,
  SwaggerOptions,
  TerminusHealthCheckOptions,
  TypeOrmStarterOptions,
} from '../../src';
import * as AutoDiscoveryHelper from '../../src/core/auto-discovery.helper';
import * as ConfigValidatorHelper from '../../src/core/config-validator.helper';
import * as CachingStarter from '../../src/starters/caching.starter';
import * as MongooseStarter from '../../src/starters/mongoose.starter';
import * as TypeOrmStarter from '../../src/starters/typeorm.starter';
import * as TerminusModule from '../../src/features/terminus-health-check.module';
import * as MetricsModule from '../../src/features/metrics/metrics.module';
import helmet from 'helmet';
import compression from 'compression';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ResponseMapper } from '../../src/interceptors/response-pattern.interceptor';

jest.mock('../../src/core/auto-discovery.helper');
jest.mock('../../src/core/config-validator.helper');
jest.mock('../../src/starters/caching.starter');
jest.mock('../../src/starters/mongoose.starter');
jest.mock('../../src/starters/typeorm.starter');
jest.mock('../../src/features/terminus-health-check.module');
jest.mock('../../src/features/metrics/metrics.module');
jest.mock('../../src/plugins/request-logger.plugin');
jest.mock('../../src/plugins/rate-limiter.plugin');
jest.mock('../../src/plugins/typeorm-migration.plugin');
jest.mock('helmet', () => jest.fn(() => 'helmet_middleware'));
jest.mock('compression', () => jest.fn(() => 'compression_middleware'));
jest.mock('@nestjs/core', () => ({
  ...jest.requireActual('@nestjs/core'),
  NestFactory: {
    create: jest.fn(),
  },
}));
jest.mock('@nestjs/swagger', () => ({
  ...jest.requireActual('@nestjs/swagger'),
  SwaggerModule: {
    createDocument: jest.fn(),
    setup: jest.fn(),
  },
  DocumentBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setVersion: jest.fn().mockReturnThis(),
    addBearerAuth: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({}),
  })),
}));

const mockConfigModule = {
  forRoot: jest.fn().mockReturnValue('ConfigModuleInstance'),
};
const mockTerminusModule = {
  forRoot: jest.fn().mockReturnValue('TerminusModuleInstance'),
};
const mockMetricsModule = {
  forRoot: jest.fn().mockReturnValue('MetricsModuleInstance'),
};
const mockCachingStarter = {
  createCachingStarter: jest.fn().mockReturnValue('CachingModuleInstance'),
};
const mockMongooseStarter = {
  createMongooseStarter: jest
    .fn()
    .mockReturnValue({ module: 'MongooseModuleInstance', plugins: [] }),
};
const mockTypeOrmStarter = {
  createTypeOrmStarter: jest
    .fn()
    .mockReturnValue({ module: 'TypeOrmModuleInstance', plugins: [] }),
};
const mockGlobalInterceptor: NestInterceptor = {
  intercept: jest.fn(),
};

@Module({})
class MockAppModule {}
class MockGuard implements CanActivate {
  canActivate = jest.fn();
}
class MockFilter implements ExceptionFilter {
  catch = jest.fn();
}
class MockInterceptor implements NestInterceptor {
  intercept = jest.fn();
}
class MockPipe implements PipeTransform {
  transform = jest.fn();
}
class MockPlugin implements AppInitializerPlugin {
  apply = jest.fn();
}
class MockProvider {}
class MockController {}

describe('AppInitializer', () => {
  let initializer: AppInitializer<INestApplication>;
  let mockAdapter: AbstractHttpAdapter;
  let mockNestApp: Partial<INestApplication>;
  let mockProcessExit: jest.SpyInstance;
  let mockLoggerError: jest.SpyInstance;

  const createInstance = (adapter?: AbstractHttpAdapter) => {
    return new (AppInitializer as any)(
      MockAppModule,
      adapter,
    ) as AppInitializer<INestApplication>;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLoggerError = jest.spyOn(Logger.prototype, 'error');
    mockProcessExit = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    (ConfigModule as any).forRoot = mockConfigModule.forRoot;
    (TerminusModule as any).TerminusHealthCheckModule.forRoot =
      mockTerminusModule.forRoot;
    (MetricsModule as any).MetricsModule.forRoot = mockMetricsModule.forRoot;
    (
      CachingStarter as jest.Mocked<typeof CachingStarter>
    ).createCachingStarter = mockCachingStarter.createCachingStarter;
    (
      MongooseStarter as jest.Mocked<typeof MongooseStarter>
    ).createMongooseStarter = mockMongooseStarter.createMongooseStarter;
    (
      TypeOrmStarter as jest.Mocked<typeof TypeOrmStarter>
    ).createTypeOrmStarter = mockTypeOrmStarter.createTypeOrmStarter;

    mockAdapter = {} as AbstractHttpAdapter;
    initializer = createInstance(mockAdapter);

    mockNestApp = {
      setGlobalPrefix: jest.fn(),
      enableCors: jest.fn(),
      enableVersioning: jest.fn(),
      use: jest.fn(),
      get: jest.fn((token: any) => {
        if (token === Reflector) return new Reflector();
        return undefined;
      }) as any, // <<< CORREÇÃO AQUI
      useGlobalInterceptors: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
      getUrl: jest.fn().mockResolvedValue('http://localhost:3000'),
      enableShutdownHooks: jest.fn(),
    };
    (NestFactory.create as jest.Mock).mockResolvedValue(mockNestApp);
    (SwaggerModule.createDocument as jest.Mock).mockReturnValue({});
  });

  describe('Configuration Methods', () => {
    it('should set port correctly', () => {
      initializer.onPort(8080);
      expect(initializer['port']).toBe(8080);
    });

    it('should set global prefix correctly', () => {
      initializer.withGlobalPrefix('api/v1');
      expect(initializer['globalPrefix']).toBe('/api/v1');
      initializer.withGlobalPrefix('/already/prefixed');
      expect(initializer['globalPrefix']).toBe('/already/prefixed');
    });

    it('should set versioning options correctly', () => {
      const options: VersioningOptions = {
        type: VersioningType.URI,
        prefix: 'v',
      };
      initializer.withVersioning(options);
      expect(initializer['versioningOptions']).toEqual(options);
    });

    it('should set CORS options correctly', () => {
      const options: CorsOptions = { origin: '*' };
      initializer.withCors(options);
      expect(initializer['corsOptions']).toEqual(options);
    });

    it('should add ValidationPipe provider correctly', () => {
      const options: ValidationPipeOptions = { disableErrorMessages: true };
      initializer.withValidationPipe(options);
      const pipeProvider = initializer['globalProviders'].find(
        (p): p is ValueProvider =>
          typeof p === 'object' && 'provide' in p && p.provide === APP_PIPE,
      );
      expect(pipeProvider).toBeDefined();
      expect(pipeProvider).toHaveProperty('useValue');
      expect(pipeProvider?.useValue).toBeInstanceOf(ValidationPipe);
      const validationPipeInstance = pipeProvider?.useValue as ValidationPipe;
      expect(validationPipeInstance['validatorOptions']).toEqual(
        expect.objectContaining({
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
      );
      expect(validationPipeInstance['transformOptions']).toEqual(
        expect.objectContaining({ enableImplicitConversion: true }),
      );
      expect(validationPipeInstance['isTransformEnabled']).toBe(true);
      expect(validationPipeInstance['isDetailedOutputDisabled']).toBe(
        options.disableErrorMessages,
      );
    });

    it('should add custom global pipe provider correctly', () => {
      initializer.useGlobalPipe(MockPipe);
      expect(initializer['globalProviders']).toContainEqual({
        provide: APP_PIPE,
        useClass: MockPipe,
      });
    });

    it('should add global filter provider correctly', () => {
      initializer.useGlobalFilter(MockFilter);
      expect(initializer['globalProviders']).toContainEqual({
        provide: APP_FILTER,
        useClass: MockFilter,
      });
    });

    it('should add global guard provider correctly', () => {
      initializer.useGlobalGuard(MockGuard);
      expect(initializer['globalProviders']).toContainEqual({
        provide: APP_GUARD,
        useClass: MockGuard,
      });
    });

    it('should add global interceptor provider correctly', () => {
      initializer.useGlobalInterceptor(MockInterceptor);
      expect(initializer['globalProviders']).toContainEqual({
        provide: APP_INTERCEPTOR,
        useClass: MockInterceptor,
      });
    });

    it('should add ClassSerializerInterceptor provider correctly', () => {
      initializer.withClassSerializer();
      expect(initializer['globalProviders']).toContainEqual({
        provide: APP_INTERCEPTOR,
        useClass: ClassSerializerInterceptor,
      });
    });

    it('should set swagger options correctly', () => {
      const options: SwaggerOptions = {
        title: 'Test API',
        version: '1.0',
        description: 'Desc',
      };
      initializer.withSwagger(options);
      expect(initializer['swaggerOptions']).toEqual({
        path: 'docs',
        ...options,
      });
    });

    it('should set advanced swagger options correctly', () => {
      initializer.withAdvancedSwaggerUI();
      expect(initializer['advancedSwaggerUiOptions']).toEqual({
        customCss: expect.stringContaining('swagger-dark-theme.css'),
        customJs: expect.stringContaining('swagger-custom.js'),
      });
    });

    it('should add graceful shutdown function', () => {
      initializer.withGracefulShutdown();
      expect(initializer['setupFunctions']).toHaveLength(1);
    });

    it('should add helmet middleware function', () => {
      initializer.useHelmet();
      expect(initializer['setupFunctions']).toHaveLength(1);
      const mockApp = { use: jest.fn() } as any;
      initializer['setupFunctions'][0](mockApp);
      expect(helmet).toHaveBeenCalledTimes(1);
      expect(mockApp.use).toHaveBeenCalledWith('helmet_middleware');
    });

    it('should add compression middleware function', () => {
      initializer.enableCompression();
      expect(initializer['setupFunctions']).toHaveLength(1);
      const mockApp = { use: jest.fn() } as any;
      initializer['setupFunctions'][0](mockApp);
      expect(compression).toHaveBeenCalledTimes(1);
      expect(mockApp.use).toHaveBeenCalledWith('compression_middleware');
    });

    it('should add plugin correctly', () => {
      const plugin = new MockPlugin();
      initializer.withPlugin(plugin);
      expect(initializer['plugins']).toContain(plugin);
    });

    it('should call validator and add ConfigModule on withValidatedConfig', () => {
      class TestSchema {}
      const mockValidate = jest.spyOn(ConfigValidatorHelper, 'validateConfig');
      initializer.withValidatedConfig(TestSchema);

      expect(mockConfigModule.forRoot).toHaveBeenCalledWith({
        isGlobal: true,
        validate: expect.any(Function),
      });
      const validateFn = mockConfigModule.forRoot.mock.calls[0][0].validate;
      const testConfig = { TEST: 'value' };
      validateFn(testConfig);
      expect(mockValidate).toHaveBeenCalledWith(testConfig, TestSchema);

      expect(initializer['featureModules']).toContain('ConfigModuleInstance');
    });

    it('should call createTypeOrmStarter and add module/plugins on withTypeOrm', () => {
      const mockPlugin = new MockPlugin();
      mockTypeOrmStarter.createTypeOrmStarter.mockReturnValue({
        module: 'TypeOrmModuleInstance',
        plugins: [mockPlugin],
      });
      const options: TypeOrmStarterOptions = { runMigrationsOnStartup: true };
      initializer.withTypeOrm(options);

      expect(mockTypeOrmStarter.createTypeOrmStarter).toHaveBeenCalledWith(
        options,
      );
      expect(initializer['featureModules']).toContain('TypeOrmModuleInstance');
      expect(initializer['plugins']).toContain(mockPlugin);
    });

    it('should call createMongooseStarter and add module on withMongoose', () => {
      const options: MongooseStarterOptions = {};
      initializer.withMongoose(options);

      expect(mockMongooseStarter.createMongooseStarter).toHaveBeenCalledWith(
        options,
      );
      expect(initializer['featureModules']).toContain('MongooseModuleInstance');
    });

    it('should call createCachingStarter and add module on withCaching', () => {
      const options: CachingStarterOptions = { defaultTtlInSeconds: 600 };
      initializer.withCaching(options);

      expect(mockCachingStarter.createCachingStarter).toHaveBeenCalledWith(
        options,
      );
      expect(initializer['featureModules']).toContain('CachingModuleInstance');
    });

    it('should call discoverComponents and store results on withAutoDiscovery', () => {
      const mockComponents = {
        providers: [MockProvider],
        controllers: [MockController],
      };
      const mockDiscover = jest
        .spyOn(AutoDiscoveryHelper, 'discoverComponents')
        .mockReturnValue(mockComponents);
      const options = { basePath: '/test' };
      initializer.withAutoDiscovery(options);

      expect(mockDiscover).toHaveBeenCalledWith(
        options.basePath,
        expect.any(Reflector),
      );
      expect(initializer['autoDiscoveredComponents']).toEqual(mockComponents);
    });

    it('should add Terminus module on withHealthCheck', () => {
      const options: TerminusHealthCheckOptions = { database: true };
      initializer.withHealthCheck(options);
      expect(mockTerminusModule.forRoot).toHaveBeenCalledWith(options);
      expect(initializer['featureModules']).toContain('TerminusModuleInstance');
    });

    it('should add Metrics module on withMetrics', () => {
      initializer.withMetrics();
      expect(mockMetricsModule.forRoot).toHaveBeenCalled();
      expect(initializer['featureModules']).toContain('MetricsModuleInstance');
    });

    it('should execute configure callback only when condition is true in when()', () => {
      const mockConfigure = jest.fn();

      initializer.when(false, mockConfigure);
      expect(mockConfigure).not.toHaveBeenCalled();

      initializer.when(true, mockConfigure);
      expect(mockConfigure).toHaveBeenCalledTimes(1);
      expect(mockConfigure).toHaveBeenCalledWith(initializer);
    });

    it('should correctly configure development defaults', () => {
      const swaggerOpts: Omit<SwaggerOptions, 'path'> = {
        title: 'Dev API',
        version: '1.0',
        description: 'Desc',
      };
      initializer.useDevelopmentDefaults(swaggerOpts);

      expect(initializer['swaggerOptions']).toEqual({
        path: 'docs',
        ...swaggerOpts,
      });
      expect(
        initializer['plugins'].some((p) => p instanceof RequestLoggerPlugin),
      ).toBe(true);
    });

    it('should correctly configure production defaults', () => {
      initializer.useProductionDefaults();

      expect(initializer['setupFunctions']).toHaveLength(3);
      expect(
        initializer['plugins'].some((p) => p instanceof RateLimiterPlugin),
      ).toBe(true);
    });
  });

  describe('bootstrap (static method)', () => {
    it('should call configurator and listen on success', async () => {
      const mockConfigurator = jest.fn();
      const listenSpy = jest
        .spyOn(AppInitializer.prototype as any, 'listen')
        .mockResolvedValue(undefined);

      await AppInitializer.bootstrap(MockAppModule, mockConfigurator);

      expect(mockConfigurator).toHaveBeenCalledTimes(1);
      expect(mockConfigurator.mock.calls[0][0]).toBeInstanceOf(AppInitializer);
      expect(listenSpy).toHaveBeenCalledTimes(1);
      expect(mockProcessExit).not.toHaveBeenCalled();
      expect(mockLoggerError).not.toHaveBeenCalled();

      listenSpy.mockRestore();
    });

    it('should catch error during configuration, log, and exit', async () => {
      const configError = new Error('Config Error');
      const mockConfigurator = jest.fn(() => {
        throw configError;
      });
      const listenSpy = jest.spyOn(AppInitializer.prototype as any, 'listen');

      await AppInitializer.bootstrap(MockAppModule, mockConfigurator);

      expect(mockConfigurator).toHaveBeenCalledTimes(1);
      expect(listenSpy).not.toHaveBeenCalled();
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining(
          'Falha ao inicializar a aplicação. Error: Config Error',
        ),
        configError.stack,
      );
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
      expect(mockProcessExit).toHaveBeenCalledWith(1);

      listenSpy.mockRestore();
    });

    it('should catch error during listen, log, and exit', async () => {
      const listenError = new Error('Listen Error');
      const mockConfigurator = jest.fn();
      const listenSpy = jest
        .spyOn(AppInitializer.prototype as any, 'listen')
        .mockRejectedValue(listenError);

      await AppInitializer.bootstrap(MockAppModule, mockConfigurator);

      expect(mockConfigurator).toHaveBeenCalledTimes(1);
      expect(listenSpy).toHaveBeenCalledTimes(1);
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining(
          'Falha ao inicializar a aplicação. Error: Listen Error',
        ),
        listenError.stack,
      );
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
      expect(mockProcessExit).toHaveBeenCalledWith(1);

      listenSpy.mockRestore();
    });
  });

  describe('listen (internal method)', () => {
    it('should create Nest app instance', async () => {
      await initializer['listen']();
      expect(NestFactory.create).toHaveBeenCalledTimes(1);
      expect((NestFactory.create as jest.Mock).mock.calls[0][0].name).toBe(
        'DynamicRootModule',
      );
    });

    it('should create Nest app instance with adapter if provided', async () => {
      const initializerWithAdapter = createInstance(mockAdapter);
      await initializerWithAdapter['listen']();
      expect(NestFactory.create).toHaveBeenCalledTimes(1);
      expect((NestFactory.create as jest.Mock).mock.calls[0][0].name).toBe(
        'DynamicRootModule',
      );
      expect((NestFactory.create as jest.Mock).mock.calls[0][1]).toBe(
        mockAdapter,
      );
    });

    it('should apply basic app settings (prefix, cors, versioning)', async () => {
      initializer.withGlobalPrefix('/api/v2');
      initializer.withCors({ origin: 'test.com' });
      initializer.withVersioning({ type: VersioningType.URI, prefix: 'v' });

      await initializer['listen']();

      expect(mockNestApp.setGlobalPrefix).toHaveBeenCalledWith('/api/v2');
      expect(mockNestApp.enableCors).toHaveBeenCalledWith({
        origin: 'test.com',
      });
      expect(mockNestApp.enableVersioning).toHaveBeenCalledWith({
        type: VersioningType.URI,
        prefix: 'v',
      });
    });

    it('should apply setup functions (helmet, compression, shutdown)', async () => {
      initializer.useHelmet();
      initializer.enableCompression();
      initializer.withGracefulShutdown();

      await initializer['listen']();

      expect(helmet).toHaveBeenCalledTimes(1);
      expect(compression).toHaveBeenCalledTimes(1);
      expect(mockNestApp.use).toHaveBeenCalledWith('helmet_middleware');
      expect(mockNestApp.use).toHaveBeenCalledWith('compression_middleware');
      expect(mockNestApp.enableShutdownHooks).toHaveBeenCalledTimes(1);
    });

    it('should apply plugins', async () => {
      const plugin1 = new MockPlugin();
      const plugin2 = new MockPlugin();
      jest.spyOn(plugin1, 'apply'); // Spy on apply method
      jest.spyOn(plugin2, 'apply');
      initializer.withPlugin(plugin1);
      initializer.withPlugin(plugin2);

      await initializer['listen']();

      expect(plugin1.apply).toHaveBeenCalledTimes(1);
      expect(plugin1.apply).toHaveBeenCalledWith(mockNestApp);
      expect(plugin2.apply).toHaveBeenCalledTimes(1);
      expect(plugin2.apply).toHaveBeenCalledWith(mockNestApp);
    });

    it('should setup Swagger if options are provided', async () => {
      const swaggerOptions: SwaggerOptions = {
        title: 'My API',
        version: '1.0',
        description: 'API Desc',
      };
      initializer.withSwagger(swaggerOptions);

      await initializer['listen']();

      expect(DocumentBuilder).toHaveBeenCalledTimes(1);
      expect(SwaggerModule.createDocument).toHaveBeenCalledTimes(1);
      expect(SwaggerModule.createDocument).toHaveBeenCalledWith(
        mockNestApp,
        {},
        undefined,
      );
      expect(SwaggerModule.setup).toHaveBeenCalledTimes(1);
      expect(SwaggerModule.setup).toHaveBeenCalledWith(
        'docs',
        mockNestApp,
        {},
        undefined,
      );
    });

    it('should setup app with response mapper interceptor', async () => {
      const responseMapper: ResponseMapper<any> = () => {
        return '123';
      };

      initializer.withResponseMapper(responseMapper);

      await initializer['listen']();

      expect(mockNestApp.useGlobalInterceptors).toHaveBeenCalledTimes(1);
    });

    it('should setup app with global interceptors', async () => {
      initializer.addGlobalInterceptor(mockGlobalInterceptor);

      await initializer['listen']();
      expect(mockNestApp.useGlobalInterceptors).toHaveBeenCalledTimes(1);
      expect(mockNestApp.useGlobalInterceptors).toHaveBeenCalledWith(
        mockGlobalInterceptor,
      );
    });

    it('should call app.listen with the correct port', async () => {
      initializer.onPort(9000);
      await initializer['listen']();
      expect(mockNestApp.listen).toHaveBeenCalledTimes(1);
      expect(mockNestApp.listen).toHaveBeenCalledWith(9000);
    });

    it('should log startup messages', async () => {
      const logSpy = jest.spyOn(initializer['logger'], 'log');
      initializer.withSwagger({ title: 'T', version: '1', description: 'D' });

      await initializer['listen']();

      expect(logSpy).toHaveBeenCalledWith(
        'Criando a instância da aplicação NestJS...',
      );
      expect(logSpy).toHaveBeenCalledWith(
        '🚀 Aplicação rodando em: http://localhost:3000',
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('📄 Documentação Swagger disponível em:'),
      );

      logSpy.mockRestore();
    });
  });
});
