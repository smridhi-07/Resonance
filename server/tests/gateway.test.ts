import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { io as Client, type Socket as ClientSocket } from 'socket.io-client';

import { SchemaValidator } from '../src/validator.js';
import { TelemetryStateManager } from '../src/telemetryState.js';
import { SocketHub } from '../src/socketHub.js';
import { createApp } from '../src/app.js';
import type { ResonanceSensorEvent } from '../src/types.js';

describe('Resonance Gateway Service (Phase 2)', () => {
  const schemaPath = path.resolve(process.cwd(), '../contracts/sensor-event.schema.json');
  const normalEventFixture: ResonanceSensorEvent = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), '../contracts/examples/normal-event.json'), 'utf8')
  );
  const anomalyEventFixture: ResonanceSensorEvent = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), '../contracts/examples/anomaly-event.json'), 'utf8')
  );

  let validator: SchemaValidator;
  let stateManager: TelemetryStateManager;
  let socketHub: SocketHub;
  let httpServer: http.Server;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    validator = new SchemaValidator(schemaPath);
    stateManager = new TelemetryStateManager();
    httpServer = http.createServer();
    socketHub = new SocketHub(httpServer, '*');
    app = createApp(
      {
        validator,
        stateManager,
        socketHub,
        startTime: Date.now() - 5000,
      },
      {
        clientOrigin: '*',
        maxBodySize: '50kb',
      }
    );
    httpServer.on('request', app);
  });

  afterEach(async () => {
    stateManager.reset();
    await socketHub.close();
    if (httpServer.listening) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Health Endpoint
  // ---------------------------------------------------------------------------
  it('1. GET /health and /api/health return HTTP 200 and expected JSON payload', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'healthy',
      service: 'resonance-gateway',
      active_socket_clients: 0,
    });
    expect(typeof res.body.uptime_seconds).toBe('number');
    expect(res.body.uptime_seconds).toBeGreaterThanOrEqual(5);
    expect(typeof res.body.timestamp).toBe('string');

    // Also verify /api/health alias
    const apiRes = await request(app).get('/api/health');
    expect(apiRes.status).toBe(200);
    expect(apiRes.body.status).toBe('healthy');
  });

  // ---------------------------------------------------------------------------
  // 2. Valid Normal Event Acceptance
  // ---------------------------------------------------------------------------
  it('2. POST /api/sensor-data accepts a valid normal event conforming to schema', async () => {
    const payload = structuredClone(normalEventFixture);
    const res = await request(app).post('/api/sensor-data').send(payload);

    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({
      status: 'accepted',
      message: 'Telemetry event accepted and broadcast',
      event_id: payload.event_id,
      sensor_id: payload.sensor_id,
      sequence: payload.sequence,
    });
    expect(typeof res.body.received_at).toBe('string');
    expect(stateManager.hasEvent(payload.event_id)).toBe(true);
    expect(stateManager.getLatestSequence(payload.sensor_id)).toBe(payload.sequence);
  });

  // ---------------------------------------------------------------------------
  // 3. Valid Anomaly Event Acceptance
  // ---------------------------------------------------------------------------
  it('3. POST /api/sensor-data accepts a valid anomaly event conforming to schema', async () => {
    const payload = structuredClone(anomalyEventFixture);
    const res = await request(app).post('/api/sensor-data').send(payload);

    expect(res.status).toBe(202);
    expect(res.body.event_id).toBe(payload.event_id);
    expect(res.body.status).toBe('accepted');
    expect(stateManager.hasEvent(payload.event_id)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 4. Missing Required Fields
  // ---------------------------------------------------------------------------
  it('4. POST /api/sensor-data rejects payloads missing required fields with HTTP 400', async () => {
    const payload = structuredClone(normalEventFixture);
    // @ts-expect-error test invalid payload
    delete payload.features;

    const res = await request(app).post('/api/sensor-data').send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Bad Request');
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: '/features',
          keyword: 'required',
        }),
      ])
    );
  });

  // ---------------------------------------------------------------------------
  // 5. Invalid Status and Source Enums
  // ---------------------------------------------------------------------------
  it('5. POST /api/sensor-data rejects invalid status and invalid source with HTTP 400', async () => {
    const invalidStatusPayload = structuredClone(normalEventFixture);
    // @ts-expect-error test invalid enum
    invalidStatusPayload.status = 'critical';

    const resStatus = await request(app).post('/api/sensor-data').send(invalidStatusPayload);
    expect(resStatus.status).toBe(400);
    expect(resStatus.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: '/status',
          keyword: 'enum',
        }),
      ])
    );

    const invalidSourcePayload = structuredClone(normalEventFixture);
    // @ts-expect-error test invalid enum
    invalidSourcePayload.source = 'edge_device';

    const resSource = await request(app).post('/api/sensor-data').send(invalidSourcePayload);
    expect(resSource.status).toBe(400);
    expect(resSource.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: '/source',
          keyword: 'enum',
        }),
      ])
    );
  });

  // ---------------------------------------------------------------------------
  // 6. Invalid & Non-UTC Timestamps
  // ---------------------------------------------------------------------------
  it('6. POST /api/sensor-data rejects invalid and non-UTC timestamps with HTTP 400', async () => {
    const nonUtcOffsets = [
      '2026-10-24T14:30:00+02:00',
      '2026-10-24T14:30:00-05:00',
      '2026-10-24T14:30:00',
      'not-a-timestamp',
    ];

    for (const badTs of nonUtcOffsets) {
      const payload = structuredClone(normalEventFixture);
      payload.timestamp = badTs;

      const res = await request(app).post('/api/sensor-data').send(payload);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Bad Request');
    }
  });

  // ---------------------------------------------------------------------------
  // 7. Negative Feature Values and Anomaly Scores
  // ---------------------------------------------------------------------------
  it('7. POST /api/sensor-data rejects negative feature values and negative anomaly scores with HTTP 400', async () => {
    const negativeFeaturePayload = structuredClone(normalEventFixture);
    negativeFeaturePayload.features.rms = -0.05;

    const resFeature = await request(app).post('/api/sensor-data').send(negativeFeaturePayload);
    expect(resFeature.status).toBe(400);
    expect(resFeature.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: '/features/rms',
          keyword: 'minimum',
        }),
      ])
    );

    const negativeScorePayload = structuredClone(normalEventFixture);
    negativeScorePayload.anomaly_score = -1.2;

    const resScore = await request(app).post('/api/sensor-data').send(negativeScorePayload);
    expect(resScore.status).toBe(400);
    expect(resScore.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: '/anomaly_score',
          keyword: 'minimum',
        }),
      ])
    );
  });

  // ---------------------------------------------------------------------------
  // 8. Duplicate event_id Rejection
  // ---------------------------------------------------------------------------
  it('8. POST /api/sensor-data rejects duplicate event_id with HTTP 409 Conflict', async () => {
    const payload1 = structuredClone(normalEventFixture);
    payload1.event_id = 'evt_duplicate_test';
    payload1.sequence = 1;

    const firstRes = await request(app).post('/api/sensor-data').send(payload1);
    expect(firstRes.status).toBe(202);

    // Send identical event_id on different sequence
    const payload2 = structuredClone(normalEventFixture);
    payload2.event_id = 'evt_duplicate_test';
    payload2.sequence = 2;

    const duplicateRes = await request(app).post('/api/sensor-data').send(payload2);
    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.error).toBe('Conflict');
    expect(duplicateRes.body.message).toContain('Duplicate event_id');
  });

  // ---------------------------------------------------------------------------
  // 9. Sequence Equal to Previous Accepted Sequence Rejection
  // ---------------------------------------------------------------------------
  it('9. POST /api/sensor-data rejects sequence number equal to previous accepted sequence with HTTP 409', async () => {
    const payload1 = structuredClone(normalEventFixture);
    payload1.event_id = 'evt_seq_eq_1';
    payload1.sensor_id = 'Sensor_Alpha';
    payload1.sequence = 10;

    const res1 = await request(app).post('/api/sensor-data').send(payload1);
    expect(res1.status).toBe(202);

    const payload2 = structuredClone(normalEventFixture);
    payload2.event_id = 'evt_seq_eq_2';
    payload2.sensor_id = 'Sensor_Alpha';
    payload2.sequence = 10; // Same sequence

    const res2 = await request(app).post('/api/sensor-data').send(payload2);
    expect(res2.status).toBe(409);
    expect(res2.body.error).toBe('Conflict');
    expect(res2.body.message).toContain('Sequence must be strictly greater');
  });

  // ---------------------------------------------------------------------------
  // 10. Sequence Lower than Previous Accepted Sequence Rejection
  // ---------------------------------------------------------------------------
  it('10. POST /api/sensor-data rejects sequence number lower than previous accepted sequence with HTTP 409', async () => {
    const payload1 = structuredClone(normalEventFixture);
    payload1.event_id = 'evt_seq_low_1';
    payload1.sensor_id = 'Sensor_Beta';
    payload1.sequence = 20;

    const res1 = await request(app).post('/api/sensor-data').send(payload1);
    expect(res1.status).toBe(202);

    const payload2 = structuredClone(normalEventFixture);
    payload2.event_id = 'evt_seq_low_2';
    payload2.sensor_id = 'Sensor_Beta';
    payload2.sequence = 19; // Lower sequence

    const res2 = await request(app).post('/api/sensor-data').send(payload2);
    expect(res2.status).toBe(409);
    expect(res2.body.error).toBe('Conflict');
    expect(res2.body.message).toContain('Sequence must be strictly greater');
  });

  // ---------------------------------------------------------------------------
  // 11. Independent Sequence Tracking Per Sensor
  // ---------------------------------------------------------------------------
  it('11. POST /api/sensor-data tracks sequence numbers independently per sensor', async () => {
    // Sensor 1 at sequence 100
    const s1Event = structuredClone(normalEventFixture);
    s1Event.event_id = 'evt_sensor_1';
    s1Event.sensor_id = 'Pillar_North';
    s1Event.sequence = 100;
    const res1 = await request(app).post('/api/sensor-data').send(s1Event);
    expect(res1.status).toBe(202);

    // Sensor 2 starting at sequence 1 (much lower than sensor 1's 100, but valid for Sensor 2)
    const s2Event = structuredClone(normalEventFixture);
    s2Event.event_id = 'evt_sensor_2';
    s2Event.sensor_id = 'Pillar_South';
    s2Event.sequence = 1;
    const res2 = await request(app).post('/api/sensor-data').send(s2Event);
    expect(res2.status).toBe(202);

    expect(stateManager.getLatestSequence('Pillar_North')).toBe(100);
    expect(stateManager.getLatestSequence('Pillar_South')).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 12. Rejected Event Does Not Advance State
  // ---------------------------------------------------------------------------
  it('12. A rejected event does not advance sequence or commit event_id to state', async () => {
    // Initial valid event at seq 5
    const event1 = structuredClone(normalEventFixture);
    event1.event_id = 'evt_advance_1';
    event1.sensor_id = 'Pillar_Z';
    event1.sequence = 5;
    await request(app).post('/api/sensor-data').send(event1);

    // Invalid schema event at seq 10 (should be rejected)
    const invalidEvent = structuredClone(normalEventFixture);
    invalidEvent.event_id = 'evt_advance_bad';
    invalidEvent.sensor_id = 'Pillar_Z';
    invalidEvent.sequence = 10;
    // @ts-expect-error invalid property
    invalidEvent.features.rms = -1.0;
    const resBad = await request(app).post('/api/sensor-data').send(invalidEvent);
    expect(resBad.status).toBe(400);

    // State should still be 5, and bad event_id must not be tracked
    expect(stateManager.getLatestSequence('Pillar_Z')).toBe(5);
    expect(stateManager.hasEvent('evt_advance_bad')).toBe(false);

    // Next event at seq 6 should succeed
    const event2 = structuredClone(normalEventFixture);
    event2.event_id = 'evt_advance_2';
    event2.sensor_id = 'Pillar_Z';
    event2.sequence = 6;
    const resGood = await request(app).post('/api/sensor-data').send(event2);
    expect(resGood.status).toBe(202);
    expect(stateManager.getLatestSequence('Pillar_Z')).toBe(6);
  });

  // ---------------------------------------------------------------------------
  // 13 & 14. Socket.IO Broadcast Behavior
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // 13. Rejected Events Never Broadcast
  // ---------------------------------------------------------------------------
  it('13. Rejected events (schema invalid, duplicate, or sequence violation) are never broadcast over Socket.IO', async () => {
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address() as { port: number };
    const socketUrl = `http://localhost:${address.port}`;

    const clientSocket: ClientSocket = Client(socketUrl, {
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => clientSocket.on('connect', resolve));

    const receivedEvents: ResonanceSensorEvent[] = [];
    clientSocket.on('sensor:event', (data: ResonanceSensorEvent) => {
      receivedEvents.push(data);
    });

    // 1. Send schema-invalid payload
    const invalidPayload = structuredClone(normalEventFixture);
    // @ts-expect-error invalid status
    invalidPayload.status = 'unknown_status';
    const resInvalid = await request(httpServer).post('/api/sensor-data').send(invalidPayload);
    expect(resInvalid.status).toBe(400);

    // 2. Accept one valid event first
    const validSeed = structuredClone(normalEventFixture);
    validSeed.event_id = 'evt_seed_seq_5';
    validSeed.sequence = 5;
    await request(httpServer).post('/api/sensor-data').send(validSeed);

    // 3. Attempt duplicate event_id
    const duplicatePayload = structuredClone(normalEventFixture);
    duplicatePayload.event_id = 'evt_seed_seq_5';
    duplicatePayload.sequence = 6;
    const resDup = await request(httpServer).post('/api/sensor-data').send(duplicatePayload);
    expect(resDup.status).toBe(409);

    // 4. Attempt lower sequence
    const lowerSeqPayload = structuredClone(normalEventFixture);
    lowerSeqPayload.event_id = 'evt_lower_seq';
    lowerSeqPayload.sequence = 4;
    const resLow = await request(httpServer).post('/api/sensor-data').send(lowerSeqPayload);
    expect(resLow.status).toBe(409);

    // Wait 50ms to ensure no rejected events were broadcast
    await new Promise((r) => setTimeout(r, 50));
    // Exactly 1 broadcast should have occurred (only for the validSeed)
    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].event_id).toBe('evt_seed_seq_5');

    clientSocket.disconnect();
  });

  // ---------------------------------------------------------------------------
  // 14. Accepted Event Broadcast as sensor:event
  // ---------------------------------------------------------------------------
  it('14. An accepted event is broadcast as "sensor:event" with the canonical payload', async () => {
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address() as { port: number };
    const socketUrl = `http://localhost:${address.port}`;

    const clientSocket: ClientSocket = Client(socketUrl, {
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => clientSocket.on('connect', resolve));

    const receivedEvents: ResonanceSensorEvent[] = [];
    clientSocket.on('sensor:event', (data: ResonanceSensorEvent) => {
      receivedEvents.push(data);
    });

    const validPayload = structuredClone(normalEventFixture);
    validPayload.event_id = 'evt_broadcast_canonical';
    validPayload.sequence = 1;

    const res = await request(httpServer).post('/api/sensor-data').send(validPayload);
    expect(res.status).toBe(202);

    await new Promise((r) => setTimeout(r, 50));
    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0]).toEqual(validPayload);

    clientSocket.disconnect();
  });

  // ---------------------------------------------------------------------------
  // 15. Concurrency Race Condition Protection
  // ---------------------------------------------------------------------------
  it('15. Multiple concurrent requests cannot bypass duplicate or sequence checks', async () => {
    // 10 concurrent requests submitting the EXACT SAME event_id
    const identicalRequests = Array.from({ length: 10 }, (_, i) => {
      const payload = structuredClone(normalEventFixture);
      payload.event_id = 'evt_race_condition';
      payload.sequence = 50 + i; // even if sequence differs, same event_id
      return request(app).post('/api/sensor-data').send(payload);
    });

    const results = await Promise.all(identicalRequests);
    const successCount = results.filter((r) => r.status === 202).length;
    const conflictCount = results.filter((r) => r.status === 409).length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(9);
  });

  // ---------------------------------------------------------------------------
  // 16. Malformed JSON Handling
  // ---------------------------------------------------------------------------
  it('16. Malformed JSON payload returns a controlled HTTP 400 Bad Request error', async () => {
    const res = await request(app)
      .post('/api/sensor-data')
      .set('Content-Type', 'application/json')
      .send('{"schema_version": "1.0", "broken_json": ');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Bad Request',
      message: 'Malformed JSON payload in request body',
    });
  });

  // ---------------------------------------------------------------------------
  // 17. Oversized Request Body Handling
  // ---------------------------------------------------------------------------
  it('17. Oversized requests return HTTP 413 Payload Too Large', async () => {
    // Create an app with an intentionally tiny body limit of 50 bytes
    const tinyApp = createApp(
      {
        validator,
        stateManager,
        socketHub,
        startTime: Date.now(),
      },
      {
        clientOrigin: '*',
        maxBodySize: '50b',
      }
    );

    const normalPayload = structuredClone(normalEventFixture);
    const res = await request(tinyApp).post('/api/sensor-data').send(normalPayload);

    expect(res.status).toBe(413);
    expect(res.body.error).toBe('Payload Too Large');
    expect(res.body.message).toContain('exceeds configured maximum limit');
  });

  // ---------------------------------------------------------------------------
  // 18. Unexpected Internal Error Handling
  // ---------------------------------------------------------------------------
  it('18. Unexpected internal errors produce a controlled HTTP 500 response without leaking stack traces', async () => {
    // Mock validator throwing unexpected internal runtime error
    const brokenValidator = {
      validate: () => {
        throw new Error('Fatal database connection / internal crash simulation');
      },
      schemaPath,
    } as unknown as SchemaValidator;

    const crashApp = createApp(
      {
        validator: brokenValidator,
        stateManager,
        socketHub,
        startTime: Date.now(),
      },
      {
        clientOrigin: '*',
        maxBodySize: '50kb',
      }
    );

    const res = await request(crashApp).post('/api/sensor-data').send(normalEventFixture);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: 'Internal Server Error',
      message: 'An unexpected internal error occurred while processing the request',
    });
    // Ensure stack trace and internal error message are NOT leaked
    expect(res.body).not.toHaveProperty('stack');
    expect(JSON.stringify(res.body)).not.toContain('Fatal database connection');
  });
});
