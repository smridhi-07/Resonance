# Resonance — Frontend Monitoring Dashboard (`client`)

## Module Overview

The `client` module is the user interface for Resonance. Built with **React**, **Vite**, **TypeScript**, **Tailwind CSS**, and **Recharts**, it delivers real-time acoustic and vibration visualization for infrastructure anomaly monitoring.

> **Phase 1 Status:** Architecture specifications and interface boundaries defined. Dashboard implementation scheduled for Phase 4.

---

## Planned Responsibilities

1. **Real-Time Telemetry Consumption:** Connect to the Node.js backend via `socket.io-client` and listen for `sensor:event`.
2. **Dynamic Visualizations:**
   - Real-time time-series vibration charts (RMS, amplitude standard deviation).
   - Spectral frequency shifts (`dominant_frequency_hz`).
   - Anomaly severity indicators mapped from `anomaly_score`.
3. **Telemetry History & Alerts:** Recent events log with visual flags distinguishing `normal` and `anomaly` states.
4. **Transport State:** Resilient connection status badge (Connected, Reconnecting, Disconnected) with graceful UI degradation.

---

## Technical Stack

- **Framework:** React 19 / 18 + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Charting:** Recharts
- **Transport:** `socket.io-client`

---

## Planned Interface Mapping

The frontend consumes events matching `contracts/sensor-event.schema.json`:

```typescript
export interface SensorEventFeatures {
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
  features: SensorEventFeatures;
  source: 'simulation' | 'hardware';
}
```

---

## Setup Guide (Future Phase)

When frontend development commences:

```bash
cd client
npm create vite@latest . -- --template react-ts
npm install socket.io-client recharts lucide-react clsx tailwind-merge
npm install -D tailwindcss postcss autoprefixer
```
