/**
 * Resonance Telemetry Types
 * Strictly mirrors contracts/sensor-event.schema.json
 */

export interface SensorFeatures {
  rms: number;
  std_dev: number;
  dominant_frequency_hz: number;
}

export interface ResonanceSensorEvent {
  schema_version: '1.0';
  event_id: string;
  sensor_id: string;
  timestamp: string;
  sequence: number;
  status: 'normal' | 'anomaly';
  anomaly_score: number;
  features: SensorFeatures;
  source: 'simulation' | 'hardware';
}

export interface ServerConfig {
  port: number;
  clientOrigin: string | string[];
  maxBodySize: string;
  nodeEnv: string;
  schemaPath: string;
}

export interface HealthResponse {
  status: 'healthy';
  service: 'resonance-gateway';
  timestamp: string;
  uptime_seconds: number;
  active_socket_clients: number;
}

export interface IngestSuccessResponse {
  status: 'accepted';
  message: string;
  event_id: string;
  sensor_id: string;
  sequence: number;
  received_at: string;
}

export interface ErrorResponseDetail {
  field?: string;
  message: string;
  keyword?: string;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: ErrorResponseDetail[];
}
