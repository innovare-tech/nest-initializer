import 'reflect-metadata';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { validateConfig } from '../../src/core/config-validator.helper';
import { Expose } from 'class-transformer';

// Schema de exemplo para os testes
class MockConfigSchema {
  @Expose()
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @Expose()
  @IsInt()
  @Min(1024)
  @Max(65535)
  PORT!: number;
}

describe('validateConfig', () => {
  it('should return the validated and transformed config on success', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      PORT: '3000',
    };
    const expected = {
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      PORT: 3000,
    };

    const result = validateConfig(config, MockConfigSchema);
    expect(result).toBeInstanceOf(MockConfigSchema);
    expect(result).toEqual(expected);
  });

  it('should throw an error if a required property is missing', () => {
    const config = {
      PORT: '3000',
      // DATABASE_URL está faltando
    };

    expect(() => validateConfig(config, MockConfigSchema)).toThrow(
      '[Configuração Inválida] DATABASE_URL should not be empty, DATABASE_URL must be a string',
    );
  });

  it('should throw an error if a property has an invalid type', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      PORT: 'not-a-number',
    };

    try {
      validateConfig(config, MockConfigSchema);
      fail('Expected validateConfig to throw an error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      if (error instanceof Error) {
        expect(error.message).toContain('[Configuração Inválida]');
        expect(error.message).toContain('PORT must be an integer number');
        expect(error.message).toContain('PORT must not be less than 1024');
        expect(error.message).toContain('PORT must not be greater than 65535');
      }
    }
  });

  it('should throw an error if a number property is out of range', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      PORT: '99999',
    };

    try {
      validateConfig(config, MockConfigSchema);
      fail('Expected validateConfig to throw an error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      if (error instanceof Error) {
        expect(error.message).toEqual(
          '[Configuração Inválida] PORT must not be greater than 65535',
        );
      }
    }
  });

  it('should throw an error if a number property is out of range (Min)', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      PORT: '80',
    };

    try {
      validateConfig(config, MockConfigSchema);
      fail('Expected validateConfig to throw an error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      if (error instanceof Error) {
        expect(error.message).toEqual(
          '[Configuração Inválida] PORT must not be less than 1024',
        );
      }
    }
  });

  it('should handle extra properties gracefully (they are ignored by default)', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      PORT: '8080',
      EXTRA_PROPERTY: 'should_be_ignored',
    };
    const expected = {
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      PORT: 8080,
    };

    const result = validateConfig(config, MockConfigSchema);
    expect(result).toBeInstanceOf(MockConfigSchema);
    expect(result).toEqual(expected);
    expect(result).not.toHaveProperty('EXTRA_PROPERTY');
  });
});
