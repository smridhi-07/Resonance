import { io, Socket } from 'socket.io-client';
import type {
  ResonanceSensorEvent,
  ConnectionStatus,
  WaveformPoint,
  FrequencyPoint,
} from './types';

export type EventCallback = (event: ResonanceSensorEvent) => void;
export type StatusCallback = (status: ConnectionStatus) => void;

const BACKEND_URL =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BACKEND_URL
    ? process.env.NEXT_PUBLIC_BACKEND_URL
    : 'http://localhost:4000';

class TelemetryService {
  private socket: Socket | null = null;
  private eventListeners: Set<EventCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private currentStatus: ConnectionStatus = 'disconnected';

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  private connect() {
    try {
      this.socket = io(BACKEND_URL, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1500,
        reconnectionDelayMax: 5000,
        timeout: 5000,
        autoConnect: true,
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        this.updateStatus('connected');
      });

      this.socket.on('sensor:event', (event: ResonanceSensorEvent) => {
        this.notifyEvent(event);
      });

      this.socket.on('disconnect', () => {
        this.updateStatus('disconnected');
      });

      this.socket.on('connect_error', () => {
        this.updateStatus('disconnected');
      });
    } catch {
      this.updateStatus('disconnected');
    }
  }

  private updateStatus(status: ConnectionStatus) {
    this.currentStatus = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  private notifyEvent(event: ResonanceSensorEvent) {
    this.eventListeners.forEach((listener) => listener(event));
  }

  public subscribe(onEvent: EventCallback, onStatus?: StatusCallback): () => void {
    this.eventListeners.add(onEvent);
    if (onStatus) {
      this.statusListeners.add(onStatus);
      onStatus(this.currentStatus);
    }
    return () => {
      this.eventListeners.delete(onEvent);
      if (onStatus) {
        this.statusListeners.delete(onStatus);
      }
    };
  }

  public getStatus(): ConnectionStatus {
    return this.currentStatus;
  }
}

export const telemetryService = new TelemetryService();

/**
 * Returns initial quiet baseline waveform points across the 2.0s observation window.
 */
export function getInitialWaveform(): WaveformPoint[] {
  const points: WaveformPoint[] = [];
  const count = 40;
  for (let i = 0; i < count; i++) {
    const t = (i * 0.05).toFixed(2);
    points.push({
      time: `+${t}s`,
      timestamp: Date.now(),
      pillarA: 0,
      pillarB: 0,
      pillarC: 0,
      pillarD: 0,
    });
  }
  return points;
}

/**
 * Returns initial quiet frequency spectrum points from 0 to 50 Hz.
 */
export function getInitialFrequencySpectrum(): FrequencyPoint[] {
  const points: FrequencyPoint[] = [];
  for (let f = 0; f <= 50; f += 1) {
    points.push({
      frequency: f,
      magnitude: 0,
    });
  }
  return points;
}
