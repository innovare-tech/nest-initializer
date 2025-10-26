import 'reflect-metadata';
import { Provider } from '@nestjs/common'; // Importe Type
import { Histogram, Registry } from 'prom-client';
import { metricsProviders } from '../../../src/features/metrics/metrics.provider';
import {
  METRICS_HTTP_HISTOGRAM,
  METRICS_REGISTRY,
} from '../../../src/features/metrics/metrics.tokens';

const mockRegistryInstance = { registerMetric: jest.fn() };
const mockHistogramInstance = {};
const mockCollectDefaultMetrics = jest.fn();

jest.mock('prom-client', () => ({
  Registry: jest.fn().mockImplementation(() => mockRegistryInstance),
  Histogram: jest.fn().mockImplementation(() => mockHistogramInstance),
  collectDefaultMetrics: jest.fn((config) => mockCollectDefaultMetrics(config)),
  exponentialBuckets: jest.requireActual('prom-client').exponentialBuckets,
  linearBuckets: jest.requireActual('prom-client').linearBuckets,
}));

describe('metricsProviders', () => {
  let registryProvider: Provider | undefined;
  let histogramProvider: Provider | undefined;

  beforeAll(() => {
    registryProvider = metricsProviders.find(
      (p) =>
        typeof p === 'object' &&
        'provide' in p &&
        p.provide === METRICS_REGISTRY,
    );
    histogramProvider = metricsProviders.find(
      (p) =>
        typeof p === 'object' &&
        'provide' in p &&
        p.provide === METRICS_HTTP_HISTOGRAM,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('METRICS_REGISTRY Provider', () => {
    it('should be defined', () => {
      expect(registryProvider).toBeDefined();
    });

    it('useFactory should create a Registry instance', () => {
      const result = (registryProvider as any)?.useFactory();
      expect(Registry).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockRegistryInstance);
    });

    it('useFactory should call collectDefaultMetrics with the created registry', () => {
      (registryProvider as any)?.useFactory();
      expect(mockCollectDefaultMetrics).toHaveBeenCalledTimes(1);
      expect(mockCollectDefaultMetrics).toHaveBeenCalledWith({
        register: mockRegistryInstance,
      });
    });
  });

  describe('METRICS_HTTP_HISTOGRAM Provider', () => {
    it('should be defined', () => {
      expect(histogramProvider).toBeDefined();
    });

    it('should have METRICS_REGISTRY as an injection dependency', () => {
      expect((histogramProvider as any)?.inject).toEqual([METRICS_REGISTRY]);
    });

    it('useFactory should create a Histogram instance with correct config', () => {
      const result = (histogramProvider as any)?.useFactory(
        mockRegistryInstance,
      );
      expect(Histogram).toHaveBeenCalledTimes(1);
      expect(Histogram).toHaveBeenCalledWith({
        name: 'http_requests_duration_seconds',
        help: 'Duração das requisições HTTP em segundos',
        labelNames: ['method', 'path', 'status_code'],
        buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10],
      });
      expect(result).toBe(mockHistogramInstance);
    });

    it('useFactory should register the created histogram with the registry', () => {
      (histogramProvider as any)?.useFactory(mockRegistryInstance);
      expect(mockRegistryInstance.registerMetric).toHaveBeenCalledTimes(1);
      expect(mockRegistryInstance.registerMetric).toHaveBeenCalledWith(
        mockHistogramInstance,
      );
    });
  });
});
