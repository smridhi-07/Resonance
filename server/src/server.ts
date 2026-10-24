import http from 'node:http';
import { loadConfig } from './config.js';
import { SchemaValidator } from './validator.js';
import { TelemetryStateManager } from './telemetryState.js';
import { SocketHub } from './socketHub.js';
import { createApp } from './app.js';

export async function bootstrap() {
  const startTime = Date.now();
  const config = loadConfig();

  console.log('[Resonance Gateway] Starting up...');
  console.log(`[Resonance Gateway] Environment: ${config.nodeEnv}`);
  console.log(`[Resonance Gateway] CORS Allowed Origins: ${JSON.stringify(config.clientOrigin)}`);

  // Initialize schema validator (validates schema file on startup)
  const validator = new SchemaValidator(config.schemaPath);
  console.log(`[Resonance Gateway] Authoritative Schema loaded from: ${validator.schemaPath}`);

  // Initialize runtime telemetry state
  const stateManager = new TelemetryStateManager();

  // Create HTTP server
  const server = http.createServer();

  // Initialize Socket.IO hub attached to the HTTP server
  const socketHub = new SocketHub(server, config.clientOrigin);

  // Create Express application
  const app = createApp(
    {
      validator,
      stateManager,
      socketHub,
      startTime,
    },
    config
  );

  // Attach Express app to HTTP server
  server.on('request', app);

  // Start listening
  server.listen(config.port, () => {
    console.log(`[Resonance Gateway] Listening on http://localhost:${config.port}`);
    console.log(`[Resonance Gateway] Health endpoint: http://localhost:${config.port}/health`);
    console.log(`[Resonance Gateway] Ingest endpoint: POST http://localhost:${config.port}/api/sensor-data`);
    console.log('[Resonance Gateway] Real-time Socket.IO event: "sensor:event"');
  });

  // Graceful shutdown handling
  let isShuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[Resonance Gateway] Received ${signal}. Initiating graceful shutdown...`);

    try {
      await socketHub.close();
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      console.log('[Resonance Gateway] Shutdown complete. Goodbye.');
      process.exit(0);
    } catch (err) {
      console.error('[Resonance Gateway] Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  return { server, socketHub, stateManager, validator, config };
}

// Auto-start when executed directly
if (process.argv[1] && process.argv[1].endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  bootstrap().catch((err) => {
    console.error('[Resonance Gateway] Fatal startup error:', err);
    process.exit(1);
  });
}
