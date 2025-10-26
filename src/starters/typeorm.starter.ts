import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

import { AppInitializerPlugin } from '../core';
import { TypeOrmMigrationPlugin } from '../plugins';

/**
 * Opções para o "Starter" de TypeORM.
 */
export interface TypeOrmStarterOptions {
  autoLoadEntities?: boolean;
  runMigrationsOnStartup?: boolean;
  databaseUrlEnvKey?: string;
  typeOrmOptions?: Omit<
    TypeOrmModuleOptions,
    'url' | 'autoLoadEntities' | 'synchronize'
  >;
}

/**
 * Cria o módulo dinâmico para o "Starter" de TypeORM.
 * Esta função constrói toda a configuração necessária para o TypeOrmModule.
 */
export function createTypeOrmStarter(options: TypeOrmStarterOptions = {}) {
  const {
    autoLoadEntities = true,
    runMigrationsOnStartup = false,
    databaseUrlEnvKey = 'DATABASE_URL',
    typeOrmOptions = {},
  } = options;

  const typeOrmDynamicModule = TypeOrmModule.forRootAsync({
    imports: [],
    inject: [ConfigService],
    useFactory: (configService: ConfigService): TypeOrmModuleOptions =>
      ({
        url: configService.get<string>(databaseUrlEnvKey),
        autoLoadEntities: autoLoadEntities,
        synchronize: false,
        ...typeOrmOptions,
      }) as TypeOrmModuleOptions,
  });

  const plugins: AppInitializerPlugin[] = [];
  if (runMigrationsOnStartup) {
    plugins.push(new TypeOrmMigrationPlugin());
  }

  return {
    module: typeOrmDynamicModule,
    plugins: plugins,
  };
}
