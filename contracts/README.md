# Resonance Contracts

Authoritative, version-controlled contract specifications for telemetry events exchanged across the **Resonance** platform (Python Simulator / ML, Node.js Backend, and React Frontend).

## Overview

The primary schema in this directory is:
- **`sensor-event.schema.json`**: JSON Schema Draft 2020-12 defining the structure, constraints, and validation rules for acoustic/vibration anomaly monitoring events.

> **Disclaimer:** All example timestamps, sensor identifiers, vibration measurements, and anomaly scores included in this specification and example files are **strictly illustrative simulations** designed for software development and prototyping. Resonance is an anomaly-monitoring prototype and does not verify real-world structural damage or certified structural integrity.

---

## Authoritative Specification: `ResonanceSensorEvent`

Every event emitted by the simulation engine or microcontroller hardware and broadcast across the system must strictly conform to this contract:

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

### Field Definitions & Constraints

| Field | Type | Required | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `schema_version` | `string` | **Yes** | Exact match: `"1.0"` | SemVer schema revision; prevents contract drift. |
| `event_id` | `string` | **Yes** | Min length: 1 | Unique event identifier (`evt_xxxx` or UUID). |
| `sensor_id` | `string` | **Yes** | Min length: 1 | Identifies the physical sensor location or simulated node. |
| `timestamp` | `string` | **Yes** | RFC 3339 ending in `Z` | UTC timestamp with `Z` timezone designator. Non-UTC numeric offsets are prohibited. |
| `sequence` | `integer`| **Yes** | Minimum: 1 | Positive integer sequence counter scoped per sensor stream (see Stream Validation below). |
| `status` | `string` | **Yes** | `"normal"`, `"anomaly"` | Classification decided by model thresholding. |
| `anomaly_score` | `number` | **Yes** | Minimum: 0.0 | Unbounded non-negative severity score (see Scoring Convention below). |
| `features` | `object` | **Yes** | Strict 3 fields, no extras | Acoustic/vibration metrics over observation window. |
| `features.rms` | `number` | **Yes** | Minimum: 0.0 | Root Mean Square acceleration/displacement magnitude. |
| `features.std_dev` | `number` | **Yes** | Minimum: 0.0 | Standard deviation of windowed amplitudes. |
| `features.dominant_frequency_hz` | `number` | **Yes** | Minimum: 0.0 | Primary spectral frequency peak from FFT analysis. |
| `source` | `string` | **Yes** | `"simulation"`, `"hardware"`| Origin of the data stream. |

`additionalProperties` is set to `false` at the event level and inside the `features` object. Any unexpected properties will fail validation immediately.

---

## Anomaly Scoring Convention

`anomaly_score` represents an **unbounded non-negative continuous anomaly severity/distance metric**:
- `0.0` represents nominal baseline behavior (lowest anomaly severity).
- Higher positive values represent greater deviation from the expected structural baseline.
- **Why it is not labeled "normalized":** Because the metric is unbounded above ($\ge 0.0$, without an arbitrary $1.0$ ceiling), calling it "normalized" could be confused with a $[0, 1]$ probability or min-max range. The score accommodates raw or scaled distance metrics (such as Mahalanobis distance, reconstruction errors, or inverted Isolation Forest deviation measures).
- **Critical:** This score is **NOT a probability** and must never be interpreted, formatted, or displayed as a confidence percentage or probabilistic measure.
- The boundary distinguishing `normal` from `anomaly` status is controlled by the inference threshold configuration.

---

## Single-Payload Schema vs. Stream Runtime Boundaries

It is important to distinguish what JSON Schema validates from what the ingestion/stream runtime enforces:
- **Enforced by JSON Schema (`contracts/sensor-event.schema.json`):**
  - Syntactic structure and types.
  - Required fields and absence of undeclared properties (`additionalProperties: false`).
  - Positivity of `sequence` ($\ge 1$), non-negativity of `anomaly_score` ($\ge 0.0$) and feature values ($\ge 0.0$).
  - Strict UTC timestamp syntax ending in `Z`.
  - Non-empty string identifiers (`minLength: 1`).
- **Enforced by Ingest & Streaming Runtime Layer (Node.js Gateway / Stream Consumers):**
  - **Global `event_id` Uniqueness:** Checked against a deduplication cache or database across multiple requests.
  - **Monotonic `sequence` Progression:** Verified per-sensor stream across sequential packets to detect dropped or reordered frames. Single-payload JSON Schema validates each event in isolation and cannot evaluate historical sequence state.

---

## Example Payloads

- [normal-event.json](file:///contracts/examples/normal-event.json): Nominal vibration window under steady-state ambient conditions.
- [anomaly-event.json](file:///contracts/examples/anomaly-event.json): Elevated vibration and spectral shift representing a synthetic anomaly condition.

---

## Contract Validation

Automated validation is implemented in Python and can also be validated via Node.js in subsequent phases.

### Python Execution
Run pytest against the authoritative schema test suite:
```bash
pytest tests/contract/test_sensor_event_schema.py -v
```

### Direct NPM Task
```bash
npm run test:contract
npm run validate:examples
```
