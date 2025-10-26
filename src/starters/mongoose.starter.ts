import { ConfigService } from '@nestjs/config';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';

/**
 * Opções para o "Starter" de Mongoose (MongoDB).
 */
export interface MongooseStarterOptions {
  /**
   * Chave do .env que contém a URI de conexão com o MongoDB.
   * (Padrão: 'MONGO_URI')
   */
  uriEnvKey?: string;
  /**
   * Permite sobrescrever qualquer outra opção de configuração do Mongoose
   * (ex: { retryAttempts: 2 }).
   */
  mongooseOptions?: Omit<MongooseModuleOptions, 'uri'>;
}

/**
 * Cria o módulo dinâmico para o "Starter" de Mongoose.
 * Configura o MongooseModule para ser global e usar a URI do .env.
 */
export function createMongooseStarter(options: MongooseStarterOptions = {}) {
  const { uriEnvKey = 'MONGO_URI', mongooseOptions = {} } = options;

  const mongooseDynamicModule = MongooseModule.forRootAsync({
    imports: [],
    inject: [ConfigService],

    useFactory: (configService: ConfigService): MongooseModuleOptions => ({
      uri: configService.get<string>(uriEnvKey),
      ...mongooseOptions,
    }),
  });

  return {
    module: mongooseDynamicModule,
    plugins: [],
  };
}
