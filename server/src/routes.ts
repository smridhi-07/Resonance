import { Router, type Request, type Response, type NextFunction } from 'express';
import type { SchemaValidator } from './validator.js';
import type { TelemetryStateManager } from './telemetryState.js';
import type { SocketHub } from './socketHub.js';
import type { ResonanceSensorEvent } from './types.js';

export interface RouteDependencies {
  validator: SchemaValidator;
  stateManager: TelemetryStateManager;
  socketHub?: SocketHub;
  startTime: number;
}

export function createRouter(deps: RouteDependencies): Router {
  const router = Router();

  const handleHealth = (_req: Request, res: Response) => {
    const uptimeSeconds = Number(((Date.now() - deps.startTime) / 1000).toFixed(2));
    const activeClients = deps.socketHub ? deps.socketHub.getActiveClientCount() : 0;

    res.status(200).json({
      status: 'healthy',
      service: 'resonance-gateway',
      timestamp: new Date().toISOString(),
      uptime_seconds: uptimeSeconds,
      active_socket_clients: activeClients,
    });
  };

  // Health check endpoints
  router.get('/health', handleHealth);
  router.get('/api/health', handleHealth);

  // Ingest telemetry endpoint
  router.post(
    '/api/sensor-data',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const payload = req.body;

        // 1. Authoritative Schema Validation
        const validation = deps.validator.validate(payload);
        if (!validation.valid) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Payload validation failed against schema v1.0',
            details: validation.errors,
          });
          return;
        }

        const event = payload as ResonanceSensorEvent;

        // 2. Runtime Duplicate-ID and Sequence Monotonicity Protection
        const result = await deps.stateManager.evaluateAndCommit(event, () => {
          // Broadcast to connected dashboard clients strictly upon acceptance
          if (deps.socketHub) {
            deps.socketHub.broadcastSensorEvent(event);
          }
        });

        if (!result.accepted) {
          res.status(409).json({
            error: 'Conflict',
            message: result.reason,
          });
          return;
        }

        // 3. Accepted Response
        res.status(202).json({
          status: 'accepted',
          message: 'Telemetry event accepted and broadcast',
          event_id: event.event_id,
          sensor_id: event.sensor_id,
          sequence: event.sequence,
          received_at: new Date().toISOString(),
        });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
