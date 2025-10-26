import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckService,
  HealthIndicatorFunction,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import {
  HEALTH_CHECK_OPTIONS,
  HealthController,
} from '../../src/features/health.controller';
import { TerminusHealthCheckOptions } from '../../src';

const mockHealthCheckService = {
  check: jest.fn(),
};
const mockDbHealthIndicator = {
  pingCheck: jest.fn(),
};
const mockMemoryHealthIndicator = {
  checkHeap: jest.fn(),
  checkRSS: jest.fn(),
};

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthCheckService;
  let dbIndicator: TypeOrmHealthIndicator | null;
  let memoryIndicator: MemoryHealthIndicator;

  const createTestingModule = async (
    testOptions: TerminusHealthCheckOptions,
    provideDbIndicator = true,
  ) => {
    const dbProvider = provideDbIndicator
      ? { provide: TypeOrmHealthIndicator, useValue: mockDbHealthIndicator }
      : { provide: TypeOrmHealthIndicator, useValue: null };

    const moduleBuilder = Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HEALTH_CHECK_OPTIONS, useValue: testOptions },
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: MemoryHealthIndicator, useValue: mockMemoryHealthIndicator },
        dbProvider,
      ],
    });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthCheckService>(HealthCheckService);
    dbIndicator = module.get<TypeOrmHealthIndicator>(TypeOrmHealthIndicator);
    memoryIndicator = module.get<MemoryHealthIndicator>(MemoryHealthIndicator);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbHealthIndicator.pingCheck.mockResolvedValue({
      database: { status: 'up' },
    });
    mockMemoryHealthIndicator.checkHeap.mockResolvedValue({
      memory_heap: { status: 'up' },
    });
    mockMemoryHealthIndicator.checkRSS.mockResolvedValue({
      memory_rss: { status: 'up' },
    });
    mockHealthCheckService.check.mockImplementation(
      async (checks: HealthIndicatorFunction[]) => {
        const results = await Promise.all(checks.map((fn) => fn()));
        const info = results.reduce((acc, res) => ({ ...acc, ...res }), {});
        return { status: 'ok', info };
      },
    );
  });

  it('should be defined', async () => {
    await createTestingModule({});
    expect(controller).toBeDefined();
  });

  it('should call health.check with DB and Memory checks when options are enabled', async () => {
    await createTestingModule({ database: true, memory: {} });
    await controller.check();

    expect(healthService.check).toHaveBeenCalledTimes(1);
    const checksPassed = (healthService.check as jest.Mock).mock
      .calls[0][0] as HealthIndicatorFunction[];
    expect(checksPassed).toHaveLength(3);

    await checksPassed[0]();
    expect(dbIndicator!.pingCheck).toHaveBeenCalledWith('database');
    await checksPassed[1]();
    expect(memoryIndicator.checkHeap).toHaveBeenCalledWith(
      'memory_heap',
      200 * 1024 * 1024,
    );
    await checksPassed[2]();
    expect(memoryIndicator.checkRSS).toHaveBeenCalledWith(
      'memory_rss',
      300 * 1024 * 1024,
    );
  });

  it('should call health.check with only Memory checks when database is false', async () => {
    await createTestingModule({ database: false, memory: {} });
    await controller.check();

    expect(healthService.check).toHaveBeenCalledTimes(1);
    const checksPassed = (healthService.check as jest.Mock).mock
      .calls[0][0] as HealthIndicatorFunction[];
    expect(checksPassed).toHaveLength(2);

    await checksPassed[0]();
    expect(memoryIndicator.checkHeap).toHaveBeenCalledWith(
      'memory_heap',
      200 * 1024 * 1024,
    );
    await checksPassed[1]();
    expect(memoryIndicator.checkRSS).toHaveBeenCalledWith(
      'memory_rss',
      300 * 1024 * 1024,
    );
    expect(dbIndicator?.pingCheck).not.toHaveBeenCalled();
  });

  it('should call health.check with only DB check when memory is false', async () => {
    await createTestingModule({ database: true });
    await controller.check();

    expect(healthService.check).toHaveBeenCalledTimes(1);
    const checksPassed = (healthService.check as jest.Mock).mock
      .calls[0][0] as HealthIndicatorFunction[];
    expect(checksPassed).toHaveLength(1);

    await checksPassed[0]();
    expect(dbIndicator!.pingCheck).toHaveBeenCalledWith('database');
    expect(memoryIndicator.checkHeap).not.toHaveBeenCalled();
    expect(memoryIndicator.checkRSS).not.toHaveBeenCalled();
  });

  it('should call health.check with no specific indicator checks when both options are false', async () => {
    await createTestingModule({ database: false });
    await controller.check();

    expect(healthService.check).toHaveBeenCalledTimes(1);
    const checksPassed = (healthService.check as jest.Mock).mock
      .calls[0][0] as HealthIndicatorFunction[];
    expect(checksPassed).toHaveLength(0);

    expect(dbIndicator?.pingCheck).not.toHaveBeenCalled();
    expect(memoryIndicator.checkHeap).not.toHaveBeenCalled();
    expect(memoryIndicator.checkRSS).not.toHaveBeenCalled();
  });

  it('should use custom memory thresholds when provided', async () => {
    await createTestingModule({
      database: false,
      memory: { heapThreshold: 250, rssThreshold: 400 },
    });
    await controller.check();

    expect(healthService.check).toHaveBeenCalledTimes(1);
    const checksPassed = (healthService.check as jest.Mock).mock
      .calls[0][0] as HealthIndicatorFunction[];
    expect(checksPassed).toHaveLength(2);

    await checksPassed[0]();
    expect(memoryIndicator.checkHeap).toHaveBeenCalledWith(
      'memory_heap',
      250 * 1024 * 1024,
    );
    await checksPassed[1]();
    expect(memoryIndicator.checkRSS).toHaveBeenCalledWith(
      'memory_rss',
      400 * 1024 * 1024,
    );
  });

  it('should handle missing TypeOrmHealthIndicator gracefully when database option is true but indicator not provided', async () => {
    await createTestingModule({ database: true }, false);

    await controller.check();

    expect(healthService.check).toHaveBeenCalledTimes(1);
    const checksPassed = (healthService.check as jest.Mock).mock
      .calls[0][0] as HealthIndicatorFunction[];

    expect(checksPassed).toHaveLength(0);

    expect(memoryIndicator.checkHeap).not.toHaveBeenCalled();
    expect(memoryIndicator.checkRSS).not.toHaveBeenCalled();
    expect(mockDbHealthIndicator.pingCheck).not.toHaveBeenCalled();
    expect(dbIndicator).toBeNull();
  });
});
