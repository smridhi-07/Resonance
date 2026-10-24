import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import type { ResonanceSensorEvent } from './types.js';

export class SocketHub {
  public readonly io: SocketIOServer;
  private activeClientsCount = 0;

  constructor(httpServer: HttpServer, allowedOrigins: string | string[]) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      serveClient: false,
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    this.io.on('connection', (socket) => {
      this.activeClientsCount++;

      socket.on('disconnect', () => {
        this.activeClientsCount = Math.max(0, this.activeClientsCount - 1);
      });
    });
  }

  /**
   * Broadcasts an authoritative accepted sensor event to all connected dashboard subscribers.
   * Only called after both schema validation and runtime sequence checks succeed.
   */
  public broadcastSensorEvent(event: ResonanceSensorEvent): void {
    this.io.emit('sensor:event', event);
  }

  /**
   * Returns current count of connected Socket.IO client connections.
   */
  public getActiveClientCount(): number {
    return this.activeClientsCount;
  }

  /**
   * Gracefully closes the Socket.IO server and disconnects active sockets.
   */
  public async close(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.io.close(() => resolve());
    });
  }
}
