import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';

/**
 * Opções para o "Starter" de Cache (Redis).
 */
export interface CachingStarterOptions {
  /**
   * Chave do .env que contém a URL de conexão com o Redis.
   * (Padrão: 'REDIS_URL')
   */
  redisUrlEnvKey?: string;
  /**
   * Tempo de vida (TTL) padrão para os itens em cache, em segundos.
   * (Padrão: 300 segundos / 5 minutos)
   */
  defaultTtlInSeconds?: number;
}

/**
 * Cria o módulo dinâmico para o "Starter" de Cache.
 * Configura o CacheModule para ser global e usar o Redis.
 */
export function createCachingStarter(options: CachingStarterOptions = {}) {
  const { redisUrlEnvKey = 'REDIS_URL', defaultTtlInSeconds = 300 } = options;

  return CacheModule.registerAsync({
    isGlobal: true,

    imports: [],

    inject: [ConfigService],

    useFactory: async (configService: ConfigService) => {
      const store = await redisStore({
        url: configService.get<string>(redisUrlEnvKey),
      });

      return {
        store: () => store,
        ttl: defaultTtlInSeconds,
      };
    },
  });
}
