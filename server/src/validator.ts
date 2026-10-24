import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { ErrorObject, ValidateFunction } from 'ajv';
import type { ErrorResponseDetail, ResonanceSensorEvent } from './types.js';

export interface ValidationResult {
  valid: boolean;
  errors?: ErrorResponseDetail[];
}

export class SchemaValidator {
  private validateFn: ValidateFunction<ResonanceSensorEvent>;
  public readonly schemaPath: string;

  constructor(customSchemaPath?: string) {
    this.schemaPath = this.resolveSchemaPath(customSchemaPath);

    if (!fs.existsSync(this.schemaPath)) {
      throw new Error(
        `Authoritative JSON Schema not found at resolved path: "${this.schemaPath}". Startup aborted.`
      );
    }

    let schemaContent: unknown;
    try {
      const raw = fs.readFileSync(this.schemaPath, 'utf8');
      schemaContent = JSON.parse(raw);
    } catch (err) {
      throw new Error(
        `Failed to read or parse JSON schema from "${this.schemaPath}": ${(err as Error).message}`
      );
    }

    try {
      // Initialize Ajv with 2020-12 dialect support
      // Cast constructor and plugin for NodeNext ESM interop compatibility
      const AjvClass: any = (Ajv2020 as unknown as { default?: any }).default || Ajv2020;
      const ajv = new AjvClass({ allErrors: true, strict: false });

      const addFormatsFn: any = (addFormats as unknown as { default?: any }).default || addFormats;
      addFormatsFn(ajv);

      this.validateFn = ajv.compile(schemaContent as object) as ValidateFunction<ResonanceSensorEvent>;
    } catch (err) {
      throw new Error(
        `Failed to compile JSON Schema with Ajv2020: ${(err as Error).message}`
      );
    }
  }

  private resolveSchemaPath(customPath?: string): string {
    if (customPath && fs.existsSync(customPath)) {
      return path.resolve(customPath);
    }

    const candidatePaths = [
      customPath,
      path.resolve(process.cwd(), 'contracts/sensor-event.schema.json'),
      path.resolve(process.cwd(), '../contracts/sensor-event.schema.json'),
      path.resolve(process.cwd(), '../../contracts/sensor-event.schema.json'),
    ];

    for (const candidate of candidatePaths) {
      if (candidate && fs.existsSync(candidate)) {
        return path.resolve(candidate);
      }
    }

    // Default fallback (will throw in constructor if non-existent)
    return path.resolve(process.cwd(), '../contracts/sensor-event.schema.json');
  }

  public validate(payload: unknown): ValidationResult {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {
        valid: false,
        errors: [
          {
            field: '/',
            message: 'Payload must be a non-null JSON object',
            keyword: 'type',
          },
        ],
      };
    }

    const isValid = this.validateFn(payload);
    if (isValid) {
      return { valid: true };
    }

    const errors: ErrorResponseDetail[] = (this.validateFn.errors || []).map(
      (err: ErrorObject) => {
        let field = err.instancePath;
        if (!field && err.params && 'missingProperty' in err.params) {
          field = `/${err.params.missingProperty}`;
        }
        return {
          field: field || '/',
          message: err.message || 'Validation error',
          keyword: err.keyword,
        };
      }
    );

    return {
      valid: false,
      errors,
    };
  }
}
