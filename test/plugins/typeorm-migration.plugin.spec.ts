import 'reflect-metadata';
import { INestApplication, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmMigrationPlugin } from '../../src';

const mockDataSource = {
  runMigrations: jest.fn(),
};

const mockApp = {
  get: jest.fn(),
} as unknown as INestApplication;

const mockLoggerLog = jest.fn();
const mockLoggerError = jest.fn();
jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLoggerLog);
jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLoggerError);

describe('TypeOrmMigrationPlugin', () => {
  let plugin: TypeOrmMigrationPlugin;

  beforeEach(() => {
    jest.clearAllMocks();
    plugin = new TypeOrmMigrationPlugin();

    (mockApp.get as jest.Mock).mockReturnValue(mockDataSource);
    mockDataSource.runMigrations.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(plugin).toBeDefined();
  });

  it('should get DataSource from the application', async () => {
    await plugin.apply(mockApp);
    expect(mockApp.get).toHaveBeenCalledTimes(1);
    expect(mockApp.get).toHaveBeenCalledWith(DataSource);
  });

  it('should call runMigrations on the DataSource', async () => {
    await plugin.apply(mockApp);
    expect(mockDataSource.runMigrations).toHaveBeenCalledTimes(1);
  });

  it('should log start and success messages', async () => {
    await plugin.apply(mockApp);
    expect(mockLoggerLog).toHaveBeenCalledWith(
      'Iniciando execução das migrations do banco de dados...',
    );
    expect(mockLoggerLog).toHaveBeenCalledWith(
      'Migrations executadas com sucesso.',
    );
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('should re-throw and log error if app.get fails', async () => {
    const getError = new Error('Failed to get DataSource');
    (mockApp.get as jest.Mock).mockImplementation(() => {
      throw getError;
    });

    await expect(plugin.apply(mockApp)).rejects.toThrow(getError);
    expect(mockDataSource.runMigrations).not.toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Falha ao obter DataSource ou executar migrations.',
      getError,
    );
    expect(mockLoggerLog).not.toHaveBeenCalledWith(
      'Migrations executadas com sucesso.',
    );
  });

  it('should re-throw and log error if runMigrations fails', async () => {
    const migrationError = new Error('Migration failed');
    mockDataSource.runMigrations.mockRejectedValue(migrationError);

    await expect(plugin.apply(mockApp)).rejects.toThrow(migrationError);
    expect(mockDataSource.runMigrations).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Falha ao obter DataSource ou executar migrations.',
      migrationError,
    );
    expect(mockLoggerLog).toHaveBeenCalledWith(
      'Iniciando execução das migrations do banco de dados...',
    );
    expect(mockLoggerLog).not.toHaveBeenCalledWith(
      'Migrations executadas com sucesso.',
    );
  });
});
