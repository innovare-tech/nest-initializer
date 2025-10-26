import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

/**
 * Valida um objeto de configuração (ex: process.env) contra uma classe de schema.
 * Se a validação falhar, lança um erro detalhado.
 * @param config O objeto de configuração a ser validado (geralmente process.env).
 * @param schema A classe de schema com decoradores do class-validator.
 * @returns O objeto de configuração validado e transformado.
 */
export function validateConfig<T extends object>(
  config: Record<string, any>,
  schema: Type<T>,
): T {
  const validatedConfig = plainToInstance(schema, config, {
    enableImplicitConversion: true,
    excludeExtraneousValues: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => Object.values(error.constraints || {}).join(', '))
      .join('; ');

    throw new Error(`[Configuração Inválida] ${errorMessages}`);
  }

  return validatedConfig;
}
