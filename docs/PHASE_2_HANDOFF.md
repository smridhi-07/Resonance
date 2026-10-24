# Resonance — Phase 2 Developer Handoff

Welcome to **Phase 2: Backend Gateway & Telemetry Broker Implementation**.

This document details the exact scope, prerequisites, technical contracts, and task checklist for implementing the backend service in `/server`.

---

## 1. Context & Completed Phase 1 Deliverables

Phase 1 established the repository foundation and authoritative contracts:
- **Authoritative JSON Schema:** [contracts/sensor-event.schema.json](file:///contracts/sensor-event.schema.json) (Draft 2020-12).
- **Illustrative Payloads:** [normal-event.json](file:///contracts/examples/normal-event.json) and [anomaly-event.json](file:///contracts/examples/anomaly-event.json).
- **Contract Test Suite:** [tests/contract/test_sensor_event_schema.py](file:///tests/contract/test_sensor_event_schema.py) (48/48 passing).
- **Transport Specifications:** [docs/API_CONTRACT.md](file:///docs/API_CONTRACT.md).
- **Architecture & Boundaries:** [docs/ARCHITECTURE.md](file:///docs/ARCHITECTURE.md).

---

## 2. Phase 2 Scope & Objectives

Your role in Phase 2 is to build the **Node.js / Express / TypeScript / Socket.IO** backend inside `/server`. Do not start the React dashboard or Python ML training until this gateway is tested and verified.

### Detailed Task Sequence

1. **Pull and Branch:**
   ```bash
   git fetch origin
   git checkout main
   git pull origin main
   git checkout -b feat/phase-2-backend-gateway
   ```

2. **Initialize `/server` Workspace:**
   ```bash
   cd server
   npm init -y
   ```
   Add standard TypeScript configuration (`tsconfig.json`) configured for modern Node (ES2022 / NodeNext).

3. **Install Dependencies:**
   - Runtime: `express`, `socket.io`, `cors`, `dotenv`, `ajv`, `ajv-formats`.
   - Dev/Build: `typescript`, `@types/node`, `@types/express`, `@types/cors`, `tsx` (or `ts-node-dev`), `supertest`, `@types/supertest`, `vitest` (or `jest`).

4. **Environment & CORS Configuration:**
   - Read `PORT` (default `4000`) and `CLIENT_ORIGIN` (default `http://localhost:5173`) from root `.env` / process environment.
   - Configure Express and Socket.IO CORS policies to allow `CLIENT_ORIGIN`.

5. **Implement `GET /health`:**
   - Returns HTTP `200 OK` with JSON:
     ```json
     {
       "status": "healthy",
       "timestamp": "2026-10-24T14:35:00.000Z",
       "uptime_seconds": 12.4,
       "active_socket_clients": 0
     }
     ```

6. **Implement `POST /api/sensor-data`:**
   - Ingests incoming sensor event JSON bodies.
   - Compile and validate incoming requests using AJV with `contracts/sensor-event.schema.json`.
   - **On Schema Failure:** Return HTTP `400 Bad Request` with structured error array detailing invalid properties.
   - **On Success:**
     - Return HTTP `202 Accepted` (or `200 OK`) with `{ "status": "accepted", "event_id": payload.event_id, ... }`.
     - Emit the validated payload via Socket.IO:
       ```typescript
       io.emit('sensor:event', validatedPayload);
       ```

7. **Automated Backend Tests:**
   Create unit/integration tests in `server/`:
   - Test `GET /health` returns 200 and expected fields.
   - Test `POST /api/sensor-data` with valid payload returns 200/202.
   - Test `POST /api/sensor-data` with missing or invalid fields returns 400.
   - Test Socket.IO client receives `sensor:event` when valid HTTP POST is submitted.

8. **Verify Server Standalone:**
   - Run `npm run test` inside `server/`.
   - Start the server using `npm run dev` and test with `curl` or Postman before handing off to Phase 3.

---

## 3. Reference Commands for Phase 2 Verification

```bash
# 1. From workspace root, verify contract tests remain green
npm run test:contract

# 2. Start server in development mode
npm run server:dev   # or: cd server && npm run dev

# 3. Test health check
curl -i http://localhost:4000/health

# 4. Ingest normal sample payload
curl -i -X POST http://localhost:4000/api/sensor-data \
  -H "Content-Type: application/json" \
  -d @contracts/examples/normal-event.json

# 5. Ingest invalid payload to confirm 400 rejection
curl -i -X POST http://localhost:4000/api/sensor-data \
  -H "Content-Type: application/json" \
  -d "{\"invalid\": true}"
```

---

## 4. Key Architectural Reminders

- **No Schema Mutations:** Do not alter the JSON Schema to fit backend convenience. The schema is the shared contract.
- **Strict Validation:** Reject extra properties (`additionalProperties: false` in schema).
- **Non-blocking Broadcast:** Do not block HTTP responses on slow socket clients.
- **No Database Needed:** Resonance in Phase 2 is an in-memory streaming gateway; do not configure databases or cloud message queues unless requested.
