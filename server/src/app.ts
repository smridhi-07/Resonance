import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { createRouter, type RouteDependencies } from './routes.js';
import type { ServerConfig } from './types.js';

export function createApp(
  deps: RouteDependencies,
  config: Pick<ServerConfig, 'clientOrigin' | 'maxBodySize'>
): Express {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: config.clientOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    })
  );

  // Body parser with configurable size limit
  app.use(express.json({ limit: config.maxBodySize }));

  // Request error interceptor for JSON parsing and payload size limits
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction): void => {
    if (!err) {
      next();
      return;
    }

    const error = err as { status?: number; type?: string; message?: string };

    // Payload size exceeded
    if (error.status === 413 || error.type === 'entity.too.large') {
      res.status(413).json({
        error: 'Payload Too Large',
        message: `Request body exceeds configured maximum limit of ${config.maxBodySize}`,
      });
      return;
    }

    // Malformed JSON syntax error
    if (error.status === 400 && 'body' in (err as object)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Malformed JSON payload in request body',
      });
      return;
    }

    next(err);
  });

  // Mount routes
  app.use(createRouter(deps));

  // 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found on this server',
    });
  });

  // Global uncaught error handler (500) - hides internal details and stack traces
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    // Log error internally for diagnostics without leaking to client
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Internal Server Error]', errorMessage);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected internal error occurred while processing the request',
    });
  });

  return app;
}
