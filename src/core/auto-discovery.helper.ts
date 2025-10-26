import { join } from 'path';

import { Type } from '@nestjs/common';
import { globSync } from 'glob';
import { Reflector } from '@nestjs/core';

interface DiscoveredComponents {
  providers: Type[];
  controllers: Type[];
}

type RequireFn = (id: string) => any;

/**
 * Descobre componentes NestJS (Providers e Controllers) em um diretório.
 * @param basePath O diretório raiz para a varredura.
 * @param reflectorInst Uma instância do Reflector.
 * @param requireFn A função 'require' a ser usada (padrão: Node's require).
 */
export function discoverComponents(
  basePath: string,
  reflectorInst: Reflector,
  requireFn: RequireFn = require,
): DiscoveredComponents {
  const providers: Type[] = [];
  const controllers: Type[] = [];

  const files = globSync(join(basePath, '**/*.{ts,js}'), {
    ignore: [
      '**/*.module.{ts,js}',
      '**/*.spec.{ts,js}',
      '**/node_modules/**',
      '**/features/**',
      '**/plugins/**',
    ],
    absolute: true,
  });

  for (const file of files) {
    try {
      const exports = requireFn(file);
      for (const key in exports) {
        const exportedClass = exports[key];
        if (typeof exportedClass === 'function' && exportedClass.prototype) {
          if (reflectorInst.get<string>('path', exportedClass)) {
            controllers.push(exportedClass);
          } else if (
            reflectorInst.get<boolean>('__injectable__', exportedClass)
          ) {
            providers.push(exportedClass);
          }
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // Ignora erros
    }
  }

  return { providers, controllers };
}
