# Resonance — Backend Gateway Service (`server`)

## Module Overview

The `server` module is the central ingest and telemetry distribution hub for Resonance. Built with **Node.js**, **Express**, **TypeScript**, and **Socket.IO**, it provides real-time event distribution from ingest clients (simulator or edge microcontrollers) to the browser dashboard.

> **Phase 1 Status:** Architecture boundaries, contract rules, and interface definitions finalized. Implementation scheduled for **Phase 2**.

---

## Planned Responsibilities

1. **HTTP Ingestion:** Expose `POST /api/sensor-data` to receive single sensor event payloads from `sensor_sim` or physical hardware.
2. **Authoritative Validation:** Validate all incoming HTTP payloads against `contracts/sensor-event.schema.json` (e.g. using `ajv`). Payloads failing validation are rejected with HTTP `400 Bad Request`.
3. **Real-Time Distribution:** Broadcast validated events immediately to connected React dashboards over Socket.IO under the event name `sensor:event`.
4. **Service Health & Telemetry:** Expose `GET /health` with service status, active socket connections, and ingest metrics.
5. **CORS & Environment:** Configure permissive CORS for the Vite development server (`CLIENT_ORIGIN`) driven strictly by `.env`.

---

## Planned Interface Specifications

### HTTP Ingest: `POST /api/sensor-data`
- **Content-Type:** `application/json`
- **Request Body:** Exactly one `ResonanceSensorEvent` JSON object conforming to `contracts/sensor-event.schema.json`.
- **Response (Success):** HTTP `200 OK` or `202 Accepted` with `{ "status": "accepted", "event_id": "..." }`.
- **Response (Validation Error):** HTTP `400 Bad Request` with structured error details identifying failed schema keywords.
- **Response (Server Error):** HTTP `500 Internal Server Error`.

### WebSocket Broadcast: `sensor:event`
- **Protocol:** Socket.IO v4
- **Payload:** The exact validated `ResonanceSensorEvent` object.
- **Delivery Guarantee:** Real-time push broadcast. Note: Socket.IO event broadcasting is not durable storage.

---

## Phase 2 Setup & Initialization Guide

The Phase 2 developer will initialize this module:

```bash
cd server
npm init -y
npm install express socket.io cors dotenv ajv ajv-formats
npm install --save-dev typescript @types/node @types/express @types/cors tsx
```

Refer to [PHASE_2_HANDOFF.md](file:///docs/PHASE_2_HANDOFF.md) for step-by-step instructions.
