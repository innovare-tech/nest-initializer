import { Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as glob from 'glob';
import { discoverComponents } from '../../src/core/auto-discovery.helper';

class MockController {}
class MockProvider {}
class NonDecoratedClass {}

jest.mock('glob', () => ({
  globSync: jest.fn(),
}));

describe('discoverComponents', () => {
  let mockGlobSync: jest.SpyInstance;
  let mockReflector: Reflector;
  let mockReflectorGet: jest.Mock;
  let mockRequire: jest.Mock;

  beforeEach(() => {
    mockGlobSync = jest.spyOn(glob, 'globSync');

    // Cria um mock simples para Reflector.get
    mockReflectorGet = jest.fn((metadataKey: string, target: Type<any>) => {
      if (metadataKey === 'path' && target === MockController) return '/mock';
      if (metadataKey === '__injectable__' && target === MockProvider)
        return true;
      return undefined;
    });
    // Cria uma instância mock do Reflector que usa nosso mock do 'get'
    mockReflector = { get: mockReflectorGet } as unknown as Reflector;

    // Cria a função mock 'require'
    mockRequire = jest.fn((request: string) => {
      if (request === '/fake/path/controller.js') return { MockController };
      if (request === '/fake/path/provider.js') return { MockProvider };
      if (request === '/fake/path/mixed.js')
        return { MockController, MockProvider };
      if (request === '/fake/path/non-decorated.js')
        return { NonDecoratedClass };
      if (request === '/fake/path/non-class.js') return { configValue: 123 };
      if (request === '/fake/path/error.js')
        throw new Error('Mock require error');
      return {}; // Retorno padrão para caminhos não mockados
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty arrays when no files are found', () => {
    mockGlobSync.mockReturnValue([]);
    // Chama a função passando os mocks
    const result = discoverComponents('/base', mockReflector, mockRequire);
    expect(result).toEqual({ providers: [], controllers: [] });
    expect(mockGlobSync).toHaveBeenCalledWith(
      '/base/**/*.{ts,js}',
      expect.any(Object),
    );
    expect(mockRequire).not.toHaveBeenCalled(); // Require não deve ser chamado se não há arquivos
  });

  it('should discover controllers correctly', () => {
    mockGlobSync.mockReturnValue(['/fake/path/controller.js']);
    const result = discoverComponents('/base', mockReflector, mockRequire);

    expect(result.providers).toEqual([]);
    expect(result.controllers).toEqual([MockController]);
    expect(mockRequire).toHaveBeenCalledWith('/fake/path/controller.js');
    expect(mockReflectorGet).toHaveBeenCalledWith('path', MockController);
  });

  it('should discover providers correctly', () => {
    mockGlobSync.mockReturnValue(['/fake/path/provider.js']);
    const result = discoverComponents('/base', mockReflector, mockRequire);

    expect(result.providers).toEqual([MockProvider]);
    expect(result.controllers).toEqual([]);
    expect(mockRequire).toHaveBeenCalledWith('/fake/path/provider.js');
    expect(mockReflectorGet).toHaveBeenCalledWith('path', MockProvider);
    expect(mockReflectorGet).toHaveBeenCalledWith(
      '__injectable__',
      MockProvider,
    );
  });

  it('should discover both controllers and providers in the same file', () => {
    mockGlobSync.mockReturnValue(['/fake/path/mixed.js']);
    const result = discoverComponents('/base', mockReflector, mockRequire);

    expect(result.providers).toEqual([MockProvider]);
    expect(result.controllers).toEqual([MockController]);
    expect(mockRequire).toHaveBeenCalledWith('/fake/path/mixed.js');
  });

  it('should ignore non-decorated classes', () => {
    mockGlobSync.mockReturnValue(['/fake/path/non-decorated.js']);
    const result = discoverComponents('/base', mockReflector, mockRequire);

    expect(result.providers).toEqual([]);
    expect(result.controllers).toEqual([]);
    expect(mockRequire).toHaveBeenCalledWith('/fake/path/non-decorated.js');
    expect(mockReflectorGet).toHaveBeenCalledWith('path', NonDecoratedClass);
    expect(mockReflectorGet).toHaveBeenCalledWith(
      '__injectable__',
      NonDecoratedClass,
    );
  });

  it('should ignore non-class exports', () => {
    mockGlobSync.mockReturnValue(['/fake/path/non-class.js']);
    const result = discoverComponents('/base', mockReflector, mockRequire);

    expect(result.providers).toEqual([]);
    expect(result.controllers).toEqual([]);
    expect(mockRequire).toHaveBeenCalledWith('/fake/path/non-class.js');
    expect(mockReflectorGet).not.toHaveBeenCalled(); // Reflector não é chamado para não-funções
  });

  it('should handle errors during require and continue processing other files', () => {
    mockGlobSync.mockReturnValue([
      '/fake/path/error.js',
      '/fake/path/provider.js',
    ]);
    const result = discoverComponents('/base', mockReflector, mockRequire);

    // Deve pular o arquivo com erro e processar o próximo
    expect(result.providers).toEqual([MockProvider]);
    expect(result.controllers).toEqual([]);
    expect(mockRequire).toHaveBeenCalledWith('/fake/path/error.js');
    expect(mockRequire).toHaveBeenCalledWith('/fake/path/provider.js');
  });

  it('should use the ignore patterns provided to globSync', () => {
    discoverComponents('/base', mockReflector, mockRequire); // Apenas chama para verificar a chamada do globSync
    expect(mockGlobSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        ignore: expect.arrayContaining([
          '**/*.module.{ts,js}',
          '**/*.spec.{ts,js}',
          '**/node_modules/**',
          '**/features/**',
          '**/plugins/**',
        ]),
        absolute: true,
      }),
    );
  });
});
