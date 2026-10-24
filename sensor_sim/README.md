# Resonance — Sensor Simulation & ML Engine (`sensor_sim`)

## Module Overview

The `sensor_sim` module generates simulated acoustic and vibration telemetry, computes sliding-window signal features, runs lightweight anomaly detection inference, and dispatches validated payloads to the backend over HTTP.

> **Phase 1 Status:** Repository foundation, contract definition, and requirements established. Feature extraction pipelines and model training will be implemented in subsequent phases.

---

## Planned Responsibilities

1. **Synthetic & Dataset Replay:** Read public infrastructure benchmark vibration datasets (e.g. IMS bearing, bridge vibration benchmarks) from `data/` or synthesize baseline sinusoids with Gaussian noise.
2. **Feature Extraction:** Compute statistical and frequency-domain metrics over windowed signals:
   - Root Mean Square (`rms`)
   - Standard Deviation (`std_dev`)
   - Peak frequency via Fast Fourier Transform (`dominant_frequency_hz`)
3. **Anomaly Detection Inference:** Run trained unsupervised models (e.g., Scikit-Learn `IsolationForest` or `OneClassSVM`) to score deviation against the learned baseline.
4. **Score Mapping:** Explicitly map model decision functions into non-negative `anomaly_score` severity values.
5. **Contract Validation:** Validate payloads against `contracts/sensor-event.schema.json` prior to HTTP dispatch.
6. **Telemetry Transmission:** Send HTTP `POST` requests to `http://localhost:4000/api/sensor-data`.

---

## Local Development Setup

### 1. Python Environment Setup
Recommended Python version: **3.11+** (validated with Python 3.13):

```bash
# From workspace root
python -m venv .venv

# Activate environment
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r sensor_sim/requirements.txt
```

### 2. Running Contract Validation Tests
```bash
pytest tests/contract/test_sensor_event_schema.py -v
```

---

## Output Contract Compliance
Every dispatched event payload must strictly adhere to the authoritative specification in `contracts/sensor-event.schema.json`. See [API_CONTRACT.md](file:///docs/API_CONTRACT.md) for endpoint details.
