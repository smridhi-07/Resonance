/**
 * Resonance Client Telemetry Types
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
  raw_samples?: number[];
  fft_spectrum?: FrequencyPoint[];
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'simulated';

export interface PillarStatus {
  id: string;
  name: string;
  status: 'normal' | 'anomaly';
  lastScore: number | null;
  lastRms: number | null;
  lastStdDev: number | null;
  lastFrequency: number | null;
  lastUpdated: string;
}

export interface WaveformPoint {
  time: string;
  timestamp: number;
  pillarA: number;
  pillarB: number;
  pillarC: number;
  pillarD: number;
}

export interface FrequencyPoint {
  frequency: number;
  magnitude: number;
}

export interface FeatureTrendPoint {
  time: string;
  rms: number;
  stdDev: number;
  dominantFreq: number;
}
