# Resonance

> **Real-Time Acoustic & Vibration Anomaly-Monitoring Prototype for Aging Civil Infrastructure**

[![Contract Tests](https://img.shields.io/badge/Contract%20Tests-61%2F61%20Passing-brightgreen)](#contract-testing--validation)
[![Backend Gateway Tests](https://img.shields.io/badge/Backend%20Tests-18%2F18%20Passing-brightgreen)](#running-the-backend-gateway)
[![JSON Schema](https://img.shields.io/badge/Schema-Draft%202020--12-blue)](contracts/sensor-event.schema.json)
[![Architecture](https://img.shields.io/badge/Architecture-Monorepo-orange)](docs/ARCHITECTURE.md)

---

## Important Prototype Notice

> **Disclaimer:** Resonance is a software demonstration and anomaly-monitoring prototype engineered to detect statistical and spectral shifts in acoustic and vibration waveforms. It does **not** perform certified structural inspections, nor does it claim to verify real-world structural damage, crack growth, or bridge load capacities.

---

## 1. Project Overview

Resonance processes acoustic and vibration telemetry, detects baseline distribution anomalies using machine learning, and streams monitoring events in real time to an interactive operations dashboard.

The system is developed in staged phases:
- **Phase 1 (Complete):** Architecture, repository foundation, authoritative JSON contract, and automated schema tests.
- **Phase 2 (Next):** Node.js / Express gateway, Socket.IO real-time hub, and HTTP ingestion.
- **Phase 3:** Python sensor simulator, windowed feature extraction (RMS, FFT), and ML anomaly detection inference.
- **Phase 4:** React, Vite, Tailwind CSS, and Recharts monitoring dashboard.
- **Phase 5:** Physical microcontroller and piezoelectric accelerometer hardware integration.

---

## 2. Planned Architecture & Tech Stack

```
[ Python Simulator / ML ] ──(HTTP POST :4000)──> [ Express Gateway ] ──(Socket.IO)──> [ React Dashboard ]
  NumPy, SciPy, Scikit-learn                      Node.js, TypeScript                   Vite, Recharts, Tailwind
             ▲                                            ▲                                     ▲
             └─────────────────── [ contracts/ ] ─────────┴─────────────────────────────────────┘
                             JSON Schema Draft 2020-12
```

- **Frontend (`/client`):** React 19/18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Recharts.
- **Backend (`/server`):** Node.js 20+, Express, TypeScript, Socket.IO, AJV.
- **Simulator & Inference (`/sensor_sim`):** Python 3.11+, NumPy, Pandas, SciPy, Scikit-learn.
- **Shared Event Contract (`/contracts`):** JSON Schema Draft 2020-12 single source of truth.

For in-depth architectural diagrams and data flow, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 3. Monorepo Repository Structure

```
resonance/
├── README.md                               # Project overview and quickstart
├── CONTRIBUTING.md                         # Contribution and code quality standards
├── .gitignore                              # Comprehensive ignore rules for Node, Python, data
├── .editorconfig                           # Cross-editor formatting specifications
├── .env.example                            # Documented environment variable template
├── package.json                            # Root workspace tasks and contract validation
├── contracts/                              # Single source of truth for event contracts
│   ├── sensor-event.schema.json            # Authoritative Draft 2020-12 schema
│   ├── examples/                           # Conforming illustrative fixtures
│   │   ├── normal-event.json
│   │   └── anomaly-event.json
│   └── README.md                           # Schema specifications and field constraints
├── client/                                 # Frontend monitoring dashboard workspace
│   └── README.md
├── server/                                 # Backend gateway and WebSocket server workspace
│   └── README.md
├── sensor_sim/                             # Python simulation and ML engine workspace
│   ├── README.md
│   └── requirements.txt                    # Pinned/constrained Python dependencies
├── docs/                                   # Architectural and workflow documentation
│   ├── ARCHITECTURE.md                     # System architecture and Mermaid diagrams
│   ├── API_CONTRACT.md                     # HTTP and Socket.IO transport contracts
│   ├── GIT_WORKFLOW.md                     # Phase-by-phase sequential Git workflow
│   └── PHASE_2_HANDOFF.md                  # Detailed task guide for the Phase 2 developer
├── tests/                                  # Repository test suites
│   └── contract/                           # Contract verification tests
│       └── test_sensor_event_schema.py     # Positive and negative contract tests
├── data/                                   # Benchmark vibration datasets (tracked by .gitkeep)
│   └── .gitkeep
└── models/                                 # Serialized model artifacts (tracked by .gitkeep)
    └── .gitkeep
```

---

## 4. Getting Started

### Prerequisites
- **Node.js:** v20.x or higher (tested on v24.x)
- **Python:** 3.11+ (tested on 3.13.5)
- **Git**

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd Resonance
   ```

2. Initialize your local environment variables:
   ```bash
   cp .env.example .env
   ```

3. Install simulator and contract test dependencies:
   ```bash
   pip install -r sensor_sim/requirements.txt
   ```

---

## 5. Contract Testing & Validation

All events exchanged across tiers must strictly comply with `contracts/sensor-event.schema.json`.

Run the automated contract validation suite:
```bash
# Using npm
npm run test:contract
npm run validate:examples

# Or directly with pytest
pytest tests/contract/test_sensor_event_schema.py -v
```

The test suite validates:
- Canonical normal and anomaly example payloads
- Omission of any required root or feature attribute
- Invalid categorical status or source values
- Negative or non-finite feature metrics
- Extraneous unknown attributes (contract drift prevention)
- RFC 3339 timestamp syntax with timezone designator
- Monotonic sequence numbering constraints
- Strict schema version pinning (`"1.0"`)

---

## 6. Running the Backend Gateway

The backend gateway (`server/`) is implemented in **Node.js**, **Express**, **TypeScript**, and **Socket.IO**:

```bash
# Install backend dependencies
npm --prefix server install

# Run backend in development mode (live reload on http://localhost:4000)
npm run server:dev

# Run backend integration tests (Vitest: 18 tests)
npm run server:test

# Run TypeScript type check
npm run server:typecheck
```

For full API endpoint specifications and cURL examples, see [server/README.md](server/README.md) and [docs/API_CONTRACT.md](docs/API_CONTRACT.md).

---

## 7. Developer Handoff & Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System components, ports, and boundaries
- [docs/API_CONTRACT.md](docs/API_CONTRACT.md) — HTTP ingest, health check, and Socket.IO real-time channels
- [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) — Safe sequential collaboration procedures
- [docs/PHASE_2_HANDOFF.md](docs/PHASE_2_HANDOFF.md) — Phase 2 implementation context and specifications
- [server/README.md](server/README.md) — Backend gateway architecture, responses, and verification
- [CONTRIBUTING.md](CONTRIBUTING.md) — Coding conventions and commit guidelines