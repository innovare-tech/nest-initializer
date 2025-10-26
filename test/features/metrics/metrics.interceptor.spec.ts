import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Subject } from 'rxjs';
import { MetricsInterceptor } from '../../../src/features/metrics/metrics.interceptor';
import { METRICS_HTTP_HISTOGRAM } from '../../../src/features/metrics/metrics.tokens';

const mockEndTimer = jest.fn();
const mockHistogram = {
  startTimer: jest.fn(() => mockEndTimer),
};

const mockRequest = { method: 'GET', path: '/test', route: { path: '/test' } };
const mockResponse = { statusCode: 200 };
const mockHttpContext = {
  getRequest: jest.fn(() => mockRequest),
  getResponse: jest.fn(() => mockResponse),
};
const mockExecutionContext = {
  switchToHttp: jest.fn(() => mockHttpContext),
} as unknown as ExecutionContext;

const mockCallHandler = {
  handle: jest.fn(),
} as unknown as CallHandler;

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;

  beforeEach(async () => {
    jest.clearAllMocks();

    (
      mockExecutionContext.switchToHttp().getRequest as jest.Mock
    ).mockReturnValue(mockRequest);
    (
      mockExecutionContext.switchToHttp().getResponse as jest.Mock
    ).mockReturnValue(mockResponse);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsInterceptor,
        { provide: METRICS_HTTP_HISTOGRAM, useValue: mockHistogram },
      ],
    }).compile();

    interceptor = module.get<MetricsInterceptor>(MetricsInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should call histogram.startTimer when intercepted', () => {
    const subject = new Subject();
    (mockCallHandler.handle as jest.Mock).mockReturnValue(
      subject.asObservable(),
    );

    interceptor.intercept(mockExecutionContext, mockCallHandler); // Chama o intercept
    expect(mockHistogram.startTimer).toHaveBeenCalledTimes(1);

    subject.complete();
  });

  it('should call next.handle when intercepted', () => {
    const subject = new Subject();
    (mockCallHandler.handle as jest.Mock).mockReturnValue(
      subject.asObservable(),
    );

    interceptor.intercept(mockExecutionContext, mockCallHandler);
    expect(mockCallHandler.handle).toHaveBeenCalledTimes(1);

    subject.complete();
  });

  it('should call end timer with correct labels on success', () => {
    const specificMockRequest = {
      method: 'GET',
      path: '/users',
      route: { path: '/users' },
    };
    const specificMockResponse = { statusCode: 200 };
    const responseData = 'response data';
    const subject = new Subject();

    (mockCallHandler.handle as jest.Mock).mockReturnValue(
      subject.asObservable(),
    );
    (
      mockExecutionContext.switchToHttp().getRequest as jest.Mock
    ).mockReturnValue(specificMockRequest);
    (
      mockExecutionContext.switchToHttp().getResponse as jest.Mock
    ).mockReturnValue(specificMockResponse);

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

    subject.next(responseData);
    subject.complete();

    expect(mockEndTimer).toHaveBeenCalledTimes(1);
    expect(mockEndTimer).toHaveBeenCalledWith({
      method: 'GET',
      path: '/users',
      status_code: 200,
    });
  });

  it('should use request.path if request.route.path is missing', () => {
    const specificMockRequest = {
      method: 'POST',
      path: '/items/123',
    };
    const specificMockResponse = { statusCode: 201 };
    const responseData = { id: '123' };
    const subject = new Subject();

    (mockCallHandler.handle as jest.Mock).mockReturnValue(
      subject.asObservable(),
    );
    (
      mockExecutionContext.switchToHttp().getRequest as jest.Mock
    ).mockReturnValue(specificMockRequest);
    (
      mockExecutionContext.switchToHttp().getResponse as jest.Mock
    ).mockReturnValue(specificMockResponse);

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

    subject.next(responseData);
    subject.complete();

    expect(mockEndTimer).toHaveBeenCalledTimes(1);
    expect(mockEndTimer).toHaveBeenCalledWith({
      method: 'POST',
      path: '/items/123',
      status_code: 201,
    });
  });

  it('should call end timer with correct labels on error', () => {
    const specificMockRequest = {
      method: 'PUT',
      path: '/config',
      route: { path: '/config' },
    };
    const specificMockResponse = { statusCode: 400 };
    const error = new Error('Test Error');
    const subject = new Subject();

    (mockCallHandler.handle as jest.Mock).mockReturnValue(
      subject.asObservable(),
    );
    (
      mockExecutionContext.switchToHttp().getRequest as jest.Mock
    ).mockReturnValue(specificMockRequest);
    (
      mockExecutionContext.switchToHttp().getResponse as jest.Mock
    ).mockReturnValue(specificMockResponse);

    interceptor
      .intercept(mockExecutionContext, mockCallHandler)
      .subscribe({ error: () => {} });

    subject.error(error);

    expect(mockEndTimer).toHaveBeenCalledTimes(1);
    expect(mockEndTimer).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/config',
      status_code: 400,
    });
  });
});
