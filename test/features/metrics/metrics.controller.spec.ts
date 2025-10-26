import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from '../../../src/features/metrics/metrics.controller';
import { METRICS_REGISTRY } from '../../../src/features/metrics/metrics.tokens';

const mockResponse = {
  header: jest.fn(),
  send: jest.fn(),
};

const mockRegistry = {
  contentType: 'text/plain; version=0.0.4; charset=utf-8',
  metrics: jest.fn(),
};

describe('MetricsController', () => {
  let controller: MetricsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRegistry.metrics.mockResolvedValue(
      '# HELP nodejs_heap_size_total_bytes Process heap size from Node.js RSS.\n# TYPE nodejs_heap_size_total_bytes gauge',
    );

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: METRICS_REGISTRY,
          useValue: mockRegistry,
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should call registry.metrics', async () => {
      await controller.getMetrics(mockResponse);
      expect(mockRegistry.metrics).toHaveBeenCalledTimes(1);
    });

    it('should set Content-Type header from registry.contentType', async () => {
      await controller.getMetrics(mockResponse);
      expect(mockResponse.header).toHaveBeenCalledTimes(1);
      expect(mockResponse.header).toHaveBeenCalledWith(
        'Content-Type',
        mockRegistry.contentType,
      );
    });

    it('should send the result of registry.metrics', async () => {
      const metricsResult = '# HELP test_metric Test metric';
      mockRegistry.metrics.mockResolvedValueOnce(metricsResult);

      await controller.getMetrics(mockResponse);

      expect(mockResponse.send).toHaveBeenCalledTimes(1);
      expect(mockResponse.send).toHaveBeenCalledWith(metricsResult);
    });
  });
});
