# Resonance — Backend Gateway Service (`server`)

## 1. Module Overview

The `server` module is the central ingest and telemetry distribution hub for the **Resonance** acoustic/vibration infrastructure monitoring prototype. Built with **Node.js 20+**, **Express**, **TypeScript**, and **Socket.IO v4**, it provides:

- Strict JSON Schema Draft 2020-12 validation against the authoritative `contracts/sensor-event.schema.json`.
- In-memory runtime deduplication of `event_id` and per-sensor sequence monotonicity enforcement.
- Real-time event broadcasting to connected dashboards over Socket.IO (`sensor:event`).
- Service health telemetry (`GET /health`).

> **Operational Notice:** Resonance is an acoustic/vibration anomaly-monitoring prototype designed for infrastructure observation. An acoustic anomaly flag reflects a statistical or spectral shift away from baseline vibration patterns; it does **not** certify physical crack propagation, bridge fatigue failure, or structural load capacity loss.

---

## 2. Setup & Execution Commands

### Prerequisites
- Node.js `v20.x` or higher (tested on Node.js `v24.12.0`)
- npm `v10.x` or higher

### Installation
From the repository root:
```bash
npm --prefix server install
```
Or directly within `/server`:
```bash
cd server
npm install
```

### Running Locally (Development Mode)
Starts the Express server with live TypeScript reload using `tsx`:
```bash
# From repository root
npm run server:dev

# Or inside /server
npm run dev
```

### Production Build & Execution
```bash
cd server
npm run build
npm start
```

### Running Automated Tests
Runs the Vitest suite covering all 18 Phase 2 requirements:
```bash
# From repository root
npm run server:test

# Or inside /server
npm test
```

### Type Checking
```bash
npm run server:typecheck
```

---

## 3. Endpoints & Transport Specifications

### A. Health Check: `GET /health` (and `GET /api/health`)

Returns server operational status, uptime, and active socket connection count.

- **Method:** `GET`
- **Path:** `/health` (or `/api/health`)
- **Status:** `200 OK`
- **Response Shape:**
```json
{
  "status": "healthy",
  "service": "resonance-gateway",
  "timestamp": "2026-10-24T15:30:00.000Z",
  "uptime_seconds": 45.12,
  "active_socket_clients": 1
}
```

---

### B. Telemetry Ingest: `POST /api/sensor-data`

Receives, validates, deduplicates, and broadcasts acoustic/vibration monitoring events.

- **Method:** `POST`
- **Path:** `/api/sensor-data`
- **Headers:** `Content-Type: application/json`
- **Request Body:** Exactly one `ResonanceSensorEvent` object adhering to `contracts/sensor-event.schema.json`.

```json
{
  "schema_version": "1.0",
  "event_id": "evt_000001",
  "sensor_id": "Pillar_A",
  "timestamp": "2026-10-24T14:30:00.000Z",
  "sequence": 1,
  "status": "normal",
  "anomaly_score": 0.12,
  "features": {
    "rms": 0.034,
    "std_dev": 0.021,
    "dominant_frequency_hz": 18.5
  },
  "source": "simulation"
}
```

#### Responses

##### HTTP `202 Accepted` — Telemetry Accepted and Broadcast
Returned when the payload satisfies JSON Schema Draft 2020-12, has a unique `event_id`, and advances the sensor's `sequence` counter.
```json
{
  "status": "accepted",
  "message": "Telemetry event accepted and broadcast",
  "event_id": "evt_000001",
  "sensor_id": "Pillar_A",
  "sequence": 1,
  "received_at": "2026-10-24T14:30:00.045Z"
}
```

##### HTTP `400 Bad Request` — Schema or JSON Validation Error
Returned when the body is malformed JSON, fails schema validation, has non-UTC timestamps, negative features, or undeclared properties.
```json
{
  "error": "Bad Request",
  "message": "Payload validation failed against schema v1.0",
  "details": [
    {
      "field": "/timestamp",
      "message": "must match pattern \"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]+)?Z$\"",
      "keyword": "pattern"
    }
  ]
}
```

##### HTTP `409 Conflict` — Duplicate `event_id` or Non-Monotonic Sequence
Returned when an `event_id` has already been processed or the `sequence` number is not strictly greater than the previous sequence for that sensor.
```json
{
  "error": "Conflict",
  "message": "Duplicate event_id \"evt_000001\" rejected. Each event_id must be unique across all streams."
}
```

##### HTTP `413 Payload Too Large` — Request Body Exceeded
Returned when the incoming payload exceeds the configured `MAX_BODY_SIZE` (default `50kb`).
```json
{
  "error": "Payload Too Large",
  "message": "Request body exceeds configured maximum limit of 50kb"
}
```

##### HTTP `500 Internal Server Error` — Controlled Server Failure
Returned if an unexpected internal error occurs. Internal stack traces and sensitive error details are omitted from the client response.
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected internal error occurred while processing the request"
}
```

---

## 4. Socket.IO Real-Time Distribution

- **Protocol:** Socket.IO v4 over WebSocket / Polling
- **Event Name:** `sensor:event`
- **Broadcast Policy:**
  - Emitted strictly to all connected clients upon successful acceptance of `POST /api/sensor-data`.
  - **Zero leakage:** Malformed, schema-invalid, duplicate, or out-of-sequence events are **never** broadcast.
- **Payload:** The exact canonical `ResonanceSensorEvent` object.

```javascript
// Browser / Client-side subscriber
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', { transports: ['websocket'] });
socket.on('sensor:event', (event) => {
  console.log(`Received sensor ${event.sensor_id} seq ${event.sequence}:`, event);
});
```

---

## 5. Runtime Duplicate and Sequence Protection

- **Duplicate `event_id` Enforcement:** The gateway tracks accepted `event_id` instances in an in-memory `Set`. Resubmissions of an existing event ID return HTTP `409 Conflict`.
- **Per-Sensor Sequence Monotonicity:** Sequence counters are maintained independently per `sensor_id` in a `Map`. Every accepted event must have `sequence > lastAcceptedSequence`. Out-of-order or duplicate sequences return HTTP `409 Conflict`.
- **Atomic Concurrency Protection:** State checks and commits execute under an asynchronous mutex lock. Concurrent requests for the same event ID or identical sensor sequences are serialized, preventing race conditions from bypassing validation.
- **In-Memory Limitations:** In-memory state resets upon server restart and is localized to a single Node process. Multiple instances in a clustered deployment require a shared distributed lock and cache (e.g., Redis).

---

## 6. Verification with cURL & PowerShell

### Verify Health
```bash
# cURL
curl -i http://localhost:4000/health

# PowerShell
Invoke-RestMethod -Uri http://localhost:4000/health
```

### Ingest Valid Normal Event
```bash
# cURL
curl -i -X POST http://localhost:4000/api/sensor-data \
  -H "Content-Type: application/json" \
  -d @../contracts/examples/normal-event.json

# PowerShell
Invoke-RestMethod -Uri http://localhost:4000/api/sensor-data `
  -Method Post `
  -InFile ../contracts/examples/normal-event.json `
  -ContentType "application/json"
```

### Ingest Duplicate to Confirm HTTP 409
```bash
# Resending the exact same event returns 409 Conflict
curl -i -X POST http://localhost:4000/api/sensor-data \
  -H "Content-Type: application/json" \
  -d @../contracts/examples/normal-event.json
```

### Ingest Invalid Payload to Confirm HTTP 400
```bash
curl -i -X POST http://localhost:4000/api/sensor-data \
  -H "Content-Type: application/json" \
  -d '{"broken": "payload"}'
```
