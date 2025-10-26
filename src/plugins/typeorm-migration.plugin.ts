import { INestApplication, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppInitializerPlugin } from '../core';

/**
 * Um plugin do AppInitializer que executa automaticamente as migrations
 * do TypeORM na inicialização da aplicação.
 */
export class TypeOrmMigrationPlugin implements AppInitializerPlugin {
  private readonly logger = new Logger(TypeOrmMigrationPlugin.name);

  /**
   * Método 'apply' que será chamado pelo AppInitializer durante o bootstrap.
   * Este método é assíncrono para poder aguardar a conclusão das migrations.
   * @param app A instância da aplicação NestJS.
   */
  async apply(app: INestApplication): Promise<void> {
    try {
      const dataSource = app.get(DataSource);

      this.logger.log('Iniciando execução das migrations do banco de dados...');

      await dataSource.runMigrations();

      this.logger.log('Migrations executadas com sucesso.');
    } catch (error) {
      this.logger.error(
        'Falha ao obter DataSource ou executar migrations.',
        error,
      );
      throw error;
    }
  }
}
