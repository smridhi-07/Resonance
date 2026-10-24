import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import type { ServerConfig } from './types.js';

// Load .env from server dir first, fallback to root dir
const rootEnvPath = path.resolve(process.cwd(), '../.env');
const localEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

export function loadConfig(): ServerConfig {
  const rawPort = process.env.PORT || '4000';
  const port = Number.parseInt(rawPort, 10);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT configuration: "${rawPort}". Must be an integer between 1 and 65535.`);
  }

  const rawOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const clientOrigin = rawOrigin.includes(',')
    ? rawOrigin.split(',').map((o) => o.trim())
    : rawOrigin.trim();

  const maxBodySize = process.env.MAX_BODY_SIZE || '50kb';
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Default schema path points to contracts/sensor-event.schema.json relative to repository root
  const defaultSchemaPath = path.resolve(
    process.cwd(),
    process.cwd().endsWith('server') ? '../contracts/sensor-event.schema.json' : 'contracts/sensor-event.schema.json'
  );

  const schemaPath = process.env.SCHEMA_PATH
    ? path.resolve(process.cwd(), process.env.SCHEMA_PATH)
    : defaultSchemaPath;

  return {
    port,
    clientOrigin,
    maxBodySize,
    nodeEnv,
    schemaPath,
  };
}
