# Resonance — API & Telemetry Transport Contract

This document provides the authoritative transport specification for data exchanged between:
1. **Python Simulator / Hardware Client** and **Node.js Express Gateway** (HTTP Ingest)
2. **Node.js Gateway** and **React Dashboard** (Socket.IO Real-Time Stream)

> **Important Implementation Notice:** The endpoints and socket event channels specified below represent the authoritative design contracts established in **Phase 1** to guide sequential development. These interfaces are implemented on the server in **Phase 2**, connected to ML in **Phase 3**, and visualized in **Phase 4**.

---

## 1. Ingestion Interface: Python to Node.js (HTTP)

The sensor simulation runtime (or downstream physical edge node) delivers telemetry to the backend gateway over HTTP.

### Endpoint Details
- **Method:** `POST`
- **Path:** `/api/sensor-data`
- **Host (Planned Default):** `http://localhost:4000`
- **Headers:**
  - `Content-Type: application/json`
  - `Accept: application/json`

### Request Body
The request payload must contain **exactly one** JSON object conforming strictly to [sensor-event.schema.json](file:///contracts/sensor-event.schema.json). Batch payloads are deliberately not supported in this initial prototype to maintain low-latency, streaming event semantics.

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

### Responses

#### 202 Accepted / 200 OK — Telemetry Ingested
Returned when the incoming payload passes authoritative JSON Schema validation and has been queued/broadcast.

```json
{
  "status": "accepted",
  "event_id": "evt_000001",
  "sensor_id": "Pillar_A",
  "sequence": 1,
  "received_at": "2026-10-24T14:30:00.045Z"
}
```

#### 400 Bad Request — Contract Validation Failed
Returned when the body does not strictly satisfy `sensor-event.schema.json` (e.g. missing fields, negative values, unknown properties, invalid timestamp).

```json
{
  "error": "Bad Request",
  "message": "Payload validation failed against schema v1.0",
  "details": [
    {
      "instancePath": "/features/rms",
      "keyword": "minimum",
      "message": "must be >= 0"
    }
  ]
}
```

#### 409 Conflict — Duplicate Event ID or Sequence Ordering Violation
Returned when an event ID has already been accepted or the sequence number does not strictly advance the sensor stream.

```json
{
  "error": "Conflict",
  "message": "Duplicate event_id \"evt_000001\" rejected. Each event_id must be unique across all streams."
}
```

#### 413 Payload Too Large — Request Exceeds Size Limit
Returned when the incoming request body exceeds the configured maximum size (default: `50kb`).

```json
{
  "error": "Payload Too Large",
  "message": "Request body exceeds configured maximum limit of 50kb"
}
```

#### 500 Internal Server Error — Gateway Exception
Returned if the backend encounters an unhandled runtime error during processing. Stack traces and internal implementation details are withheld from the response.

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected internal error occurred while processing the request"
}
```

---

## 2. Gateway Service Health Interface

### Endpoint Details
- **Method:** `GET`
- **Paths:** `/health`, `/api/health`
- **Status:** `200 OK`
- **Response Format:**
```json
{
  "status": "healthy",
  "service": "resonance-gateway",
  "timestamp": "2026-10-24T14:35:00.000Z",
  "uptime_seconds": 12.4,
  "active_socket_clients": 0
}
```

---

## 3. Real-Time Distribution: Node.js to React (Socket.IO)

The backend gateway acts as a real-time event broadcaster for connected client dashboards.

### Connection Handshake
- **Protocol:** Socket.IO v4 over WebSocket / Polling fallback
- **Gateway URL (Planned Default):** `http://localhost:4000`
- **Namespace:** Default (`/`)
- **CORS Whitelist:** Configured via `CLIENT_ORIGIN` (default: `http://localhost:5173`)

### Broadcast Channel: `sensor:event`
Once an HTTP payload is authoritatively validated by the backend gateway, it is broadcast to all active subscribers.

- **Event Name:** `sensor:event`
- **Payload Format:** The exact validated `ResonanceSensorEvent` object.

```javascript
// Client-side listener example:
socket.on('sensor:event', (event) => {
  console.log(`Received sequence ${event.sequence} from sensor ${event.sensor_id}`);
  // Pass to state manager / Recharts buffer
});
```

### Connection Lifecycle & Resilience Rules
1. **Validation Gatekeeper:** Unvalidated or malformed events are **never** forwarded over Socket.IO.
2. **Disconnection Handling:** If a client disconnects, the server gracefully closes the socket connection without interruption to ingest.
3. **Reconnection & Deduplication:**
   - If the dashboard client temporarily loses connection, `socket.io-client` automatically attempts exponential-backoff reconnection.
   - When connection resumes, incoming events carry explicit `event_id` and per-sensor `sequence` counters.
   - The React client must verify `event_id` against its local buffer to drop duplicates resulting from transport-level retries.
4. **No Durability Guarantee:** Socket.IO push distribution alone does **not** provide durable persistence or backfill replay. Events broadcast while a client is offline are not retained in-memory on the socket server.

---

## 3. Core Contract Principles

1. **Field Uniformity:** Field names (`schema_version`, `event_id`, `sensor_id`, `timestamp`, `sequence`, `status`, `anomaly_score`, `features`, `source`) must remain identical across Python, TypeScript, and React codebases. No module may transform or rename contract attributes.
2. **Strict UTC Timestamps:** All timestamps must use RFC 3339 format strictly with a `Z` suffix (e.g. `2026-10-24T14:30:00.000Z`). Non-UTC numeric offsets (`+02:00`, `-05:00`) are rejected by schema pattern validation.
3. **Sequence Isolation & Monotonicity:** `sequence` numbers are positive integers scoped **per sensor stream** (e.g. `Pillar_A` maintains its own sequence starting at 1). Monotonic progression is validated across events at the gateway runtime layer.
4. **Event ID Uniqueness:** `event_id` identifies individual event instances. Cross-event uniqueness deduplication is enforced by the ingestion gateway runtime cache.
5. **Score Interpretation:** `anomaly_score` is an unbounded non-negative continuous deviation metric ($\ge 0.0$), **not a probability**. It must never be formatted or displayed as a percentage or confidence score.
