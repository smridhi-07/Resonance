"""
Resonance — Live Edge Sensor Simulator (Phase 3)
================================================
Simulates an edge IoT microcontroller node on civil infrastructure (e.g. Z24 Bridge
Pillar A) continuously acquiring windowed acoustic and vibration waveforms,
computing edge feature extractions, scoring anomaly severity with the trained
IsolationForest model, and streaming telemetry payloads to the backend gateway.

Contract Reference: contracts/sensor-event.schema.json
Ingest Endpoint:    POST http://localhost:4000/api/sensor-data
"""

import json
import os
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Tuple, Optional

import numpy as np
import requests
from scipy.fft import rfft, rfftfreq
import joblib

try:
    import jsonschema
    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False


# ------------------------------------------------------------------------------
# Configuration & Constants
# ------------------------------------------------------------------------------
GATEWAY_URL = os.getenv("INGEST_URL", "http://localhost:4000/api/sensor-data")
SENSOR_ID = os.getenv("SENSOR_ID", "Pillar_A")
SAMPLING_RATE_HZ = 100.0       # 100 Hz acquisition rate
WINDOW_SAMPLES = 200           # 2.0 second observation window (200 samples)
LOOP_INTERVAL_SEC = 1.5        # Microcontroller sleep interval between readings
ANOMALY_PROBABILITY = 0.20     # 20% anomaly injection rate (80% normal baseline)

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
DEFAULT_MODEL_PATH = SCRIPT_DIR / "model" / "isolation_forest.joblib"
SCHEMA_PATH = ROOT_DIR / "contracts" / "sensor-event.schema.json"


# ------------------------------------------------------------------------------
# Model Loading
# ------------------------------------------------------------------------------
def load_trained_model(model_path: Optional[Path] = None) -> Any:
    """
    Loads the trained IsolationForest model from disk.
    """
    candidates = [
        model_path,
        DEFAULT_MODEL_PATH,
        Path("sensor_sim/model/isolation_forest.joblib").resolve(),
    ]
    for c in candidates:
        if c and Path(c).exists():
            resolved = Path(c).resolve()
            print(f"[Model Loader] Loading trained IsolationForest model from:\n  -> {resolved}")
            return joblib.load(resolved)

    raise FileNotFoundError(
        f"Trained model not found at {DEFAULT_MODEL_PATH}. Run 'python sensor_sim/train.py' first."
    )


# ------------------------------------------------------------------------------
# Schema Contract Loader
# ------------------------------------------------------------------------------
def load_event_schema() -> Optional[Dict[str, Any]]:
    """
    Loads the authoritative Draft 2020-12 event schema for local validation.
    """
    if not SCHEMA_PATH.exists() or not HAS_JSONSCHEMA:
        return None
    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[Schema Warning] Unable to load schema for client validation: {e}")
        return None


# ------------------------------------------------------------------------------
# Feature Extraction (Identical to train.py)
# ------------------------------------------------------------------------------
def extract_contract_features(window: np.ndarray, fs: float = SAMPLING_RATE_HZ) -> Tuple[float, float, float]:
    """
    Extracts the exactly three required contract features from a 200-sample window:
      1. rms: Root Mean Square acceleration magnitude (>= 0.0)
      2. std_dev: Standard deviation of signal amplitude (>= 0.0)
      3. dominant_frequency_hz: Peak spectral frequency via FFT (>= 0.0)
    All return values are guaranteed to be non-negative finite floats.
    """
    # 1. Root Mean Square (RMS)
    rms_val = float(np.sqrt(np.mean(window ** 2)))

    # 2. Standard Deviation
    std_val = float(np.std(window))

    # 3. Peak frequency via Fast Fourier Transform (FFT)
    # Exclude DC offset (bin 0) to capture dominant dynamic vibration oscillation
    fft_magnitudes = np.abs(rfft(window))
    freq_bins = rfftfreq(len(window), d=1.0 / fs)

    if len(fft_magnitudes) > 1:
        peak_idx = int(np.argmax(fft_magnitudes[1:])) + 1
        dom_freq = float(freq_bins[peak_idx])
    else:
        dom_freq = float(freq_bins[0])

    # Enforce non-negative finite float contract requirements
    rms_val = abs(rms_val)
    std_val = abs(std_val)
    dom_freq = abs(dom_freq)

    return rms_val, std_val, dom_freq


# ------------------------------------------------------------------------------
# Waveform Synthesis (Normal Baseline vs. Injected Structural Anomaly)
# ------------------------------------------------------------------------------
def generate_vibration_window(
    inject_anomaly: bool,
    n_samples: int = WINDOW_SAMPLES,
    fs: float = SAMPLING_RATE_HZ,
) -> np.ndarray:
    """
    Synthesizes 2 seconds (200 samples at fs=100Hz) of vibration sensor data:
      - Normal (80%): Modal base frequencies in 5–15 Hz (Z24 healthy baseline modes)
                      with realistic structural ambient noise.
      - Anomaly (20%): Sudden high-amplitude 25 Hz or 30 Hz harmonic component
                       simulating structural fracture, micro-cracking, or abnormal stress.
    """
    t = np.arange(0, n_samples / fs, 1.0 / fs)

    if not inject_anomaly:
        # Normal Z24 bridge baseline signal (modes around 5.0 Hz, 8.5 Hz, 10.0 Hz, 12.0 Hz)
        # Typical baseline amplitudes: 0.5 to 2.5 m/s^2
        f1 = random.uniform(4.8, 5.2)
        f2 = random.uniform(8.2, 9.8)
        f3 = random.uniform(11.5, 12.5)

        a1 = random.uniform(1.0, 2.0)
        a2 = random.uniform(0.5, 1.2)
        a3 = random.uniform(0.3, 0.8)

        p1 = random.uniform(0, 2 * np.pi)
        p2 = random.uniform(0, 2 * np.pi)
        p3 = random.uniform(0, 2 * np.pi)

        # Baseline modal superposition
        signal = (
            a1 * np.cos(2 * np.pi * f1 * t + p1) +
            a2 * np.cos(2 * np.pi * f2 * t + p2) +
            a3 * np.cos(2 * np.pi * f3 * t + p3)
        )
        # Normal ambient Gaussian background noise
        noise = np.random.normal(0, 0.08, size=len(t))
        return signal + noise

    else:
        # Injected anomaly: Structural fracture / resonant distress
        # Sudden emergence of high-amplitude high-frequency vibration (25 Hz or 30 Hz)
        anomaly_freq = random.choice([25.0, 28.5, 30.0])
        anomaly_amp = random.uniform(15.0, 28.0)  # Heavy vibrational surge
        anomaly_phase = random.uniform(0, 2 * np.pi)

        # Normal background component
        base_f = random.uniform(5.0, 10.0)
        base_signal = 1.5 * np.cos(2 * np.pi * base_f * t)

        # High-energy anomaly surge
        fracture_signal = anomaly_amp * np.cos(2 * np.pi * anomaly_freq * t + anomaly_phase)
        stress_noise = np.random.normal(0, 0.35, size=len(t))

        return base_signal + fracture_signal + stress_noise


# ------------------------------------------------------------------------------
# Ingestion Payload Builder (Strict Draft 2020-12 Compliance)
# ------------------------------------------------------------------------------
def build_sensor_payload(
    sequence: int,
    sensor_id: str,
    status: str,
    anomaly_score: float,
    rms: float,
    std_dev: float,
    dom_freq: float,
) -> Dict[str, Any]:
    """
    Constructs a telemetry payload conforming strictly to contracts/sensor-event.schema.json:
      - schema_version: "1.0"
      - event_id: unique string ("evt_XXXXXX")
      - sensor_id: non-empty string identifier
      - timestamp: UTC ISO 8601 strictly ending with 'Z'
      - sequence: strictly positive integer
      - status: "normal" | "anomaly"
      - anomaly_score: non-negative continuous severity float
      - features: rms, std_dev, dominant_frequency_hz
      - source: "simulation"
    """
    now_utc = datetime.now(timezone.utc)
    # Strictly RFC 3339 / ISO 8601 with trailing 'Z' timezone designator
    utc_iso_timestamp = now_utc.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

    payload: Dict[str, Any] = {
        "schema_version": "1.0",
        "event_id": f"evt_{sequence:06d}",
        "sensor_id": sensor_id,
        "timestamp": utc_iso_timestamp,
        "sequence": sequence,
        "status": status,
        "anomaly_score": round(anomaly_score, 4),
        "features": {
            "rms": round(rms, 6),
            "std_dev": round(std_dev, 6),
            "dominant_frequency_hz": round(dom_freq, 2),
        },
        "source": "simulation",
    }

    return payload


# ------------------------------------------------------------------------------
# Live Simulator Main Loop
# ------------------------------------------------------------------------------
def run_live_simulator(
    endpoint: str = GATEWAY_URL,
    sensor_id: str = SENSOR_ID,
    interval_sec: float = LOOP_INTERVAL_SEC,
    model_path: Optional[Path] = None,
    max_iterations: Optional[int] = None,
) -> None:
    """
    Executes the continuous edge simulation loop.
    """
    print("=" * 80, flush=True)
    print("Resonance Phase 3: Live Edge Sensor Simulator", flush=True)
    print("=" * 80, flush=True)
    print(f"[Configuration] Target Ingest Endpoint : {endpoint}", flush=True)
    print(f"[Configuration] Active Sensor ID       : {sensor_id}", flush=True)
    print(f"[Configuration] Sampling Frequency     : {SAMPLING_RATE_HZ} Hz ({WINDOW_SAMPLES} samples/window)", flush=True)
    print(f"[Configuration] Stream Cycle Interval  : {interval_sec}s", flush=True)
    print(f"[Configuration] Anomaly Injection Rate : {int(ANOMALY_PROBABILITY * 100)}% (80% Normal baseline)", flush=True)
    if max_iterations:
        print(f"[Configuration] Iteration Limit        : {max_iterations} events", flush=True)

    # 1. Load trained model
    model = load_trained_model(model_path)

    # 2. Load schema for proactive contract verification
    schema = load_event_schema()
    if schema:
        print("[Schema Check] Contract sensor-event.schema.json loaded. Active payload validation enabled.", flush=True)
    else:
        print("[Schema Check] Schema validation skipped (file not found or jsonschema uninstalled).", flush=True)

    print("\nStarting live edge telemetry broadcast... Press Ctrl+C to terminate.", flush=True)
    print("-" * 80, flush=True)
    print(f"{'Seq':<7} | {'Event Nature':<17} | {'Pred':<7} | {'Score':<7} | {'RMS (m/s²)':<10} | {'Peak Freq':<10} | {'HTTP Gateway Status'}", flush=True)
    print("-" * 80, flush=True)

    sequence = 1
    session = requests.Session()
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    try:
        while True:
            # 1. Decide event nature: 80% Normal baseline vs. 20% Injected Anomaly
            is_anomaly = random.random() < ANOMALY_PROBABILITY
            event_nature = "INJECTED ANOMALY" if is_anomaly else "Normal"

            # 2. Synthesize 200-sample waveform (2 seconds at 100 Hz)
            waveform = generate_vibration_window(inject_anomaly=is_anomaly, n_samples=WINDOW_SAMPLES, fs=SAMPLING_RATE_HZ)

            # 3. Extract the exact 3 contract features
            rms, std_dev, dom_freq = extract_contract_features(waveform, fs=SAMPLING_RATE_HZ)

            # 4. Inference via IsolationForest
            feature_vector = np.array([[rms, std_dev, dom_freq]], dtype=np.float64)
            prediction = model.predict(feature_vector)[0]
            decision_val = model.decision_function(feature_vector)[0]

            # Status and non-negative anomaly severity score mapping
            # IsolationForest: 1 = inlier (normal), -1 = outlier (anomaly)
            status = "normal" if prediction == 1 else "anomaly"
            # Non-negative continuous score: nominal baseline is 0.0; deviation produces positive scores
            anomaly_score = max(0.0, float(-decision_val))

            # 5. Build strict JSON payload
            payload = build_sensor_payload(
                sequence=sequence,
                sensor_id=sensor_id,
                status=status,
                anomaly_score=anomaly_score,
                rms=rms,
                std_dev=std_dev,
                dom_freq=dom_freq,
            )

            # 6. Contract validation gatekeeper
            if schema and HAS_JSONSCHEMA:
                try:
                    jsonschema.validate(instance=payload, schema=schema)
                except jsonschema.ValidationError as val_err:
                    print(f"\n[FATAL CONTRACT ERROR] Payload sequence #{sequence} violates schema:", flush=True)
                    print(f"  Field: {list(val_err.path)}", flush=True)
                    print(f"  Error: {val_err.message}", flush=True)
                    sys.exit(1)

            # 7. HTTP Telemetry Dispatch
            http_status_str = ""
            try:
                response = session.post(endpoint, json=payload, headers=headers, timeout=2.0)
                if response.status_code in (200, 202):
                    http_status_str = f"{response.status_code} Accepted"
                else:
                    http_status_str = f"{response.status_code} {response.reason}"
            except requests.exceptions.ConnectionError:
                http_status_str = "[Gateway Offline: Port 4000]"
            except requests.exceptions.Timeout:
                http_status_str = "[Request Timeout]"
            except Exception as ex:
                http_status_str = f"[Error: {ex}]"

            # 8. Clean formatted console logging
            nature_styled = f"\033[91m{event_nature:<17}\033[0m" if is_anomaly else f"\033[92m{event_nature:<17}\033[0m"
            pred_styled = f"\033[91m{status:<7}\033[0m" if status == "anomaly" else f"\033[92m{status:<7}\033[0m"

            # If terminal doesn't support ANSI codes cleanly, fallback to standard text
            if not sys.stdout.isatty():
                nature_styled = f"{event_nature:<17}"
                pred_styled = f"{status:<7}"

            print(
                f"#{sequence:<6} | "
                f"{nature_styled} | "
                f"{pred_styled} | "
                f"{anomaly_score:<7.4f} | "
                f"{rms:<10.4f} | "
                f"{dom_freq:<7.2f} Hz | "
                f"{http_status_str}",
                flush=True
            )

            # Check if requested max iterations reached
            if max_iterations and sequence >= max_iterations:
                print("-" * 80, flush=True)
                print(f"[Simulator] Completed requested limit of {sequence} iterations.", flush=True)
                print("=" * 80, flush=True)
                break

            # Increment monotonic sequence number
            sequence += 1

            # Microcontroller observation sleep interval
            time.sleep(interval_sec)

    except KeyboardInterrupt:
        print("\n" + "-" * 80, flush=True)
        print(f"[Simulator] Stopped by user after dispatching {sequence - 1} telemetry events.", flush=True)
        print("=" * 80, flush=True)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Live Edge Sensor Simulator for Resonance")
    parser.add_argument("-n", "--iterations", type=int, default=None, help="Number of iterations to run (default: infinite loop)")
    parser.add_argument("--interval", type=float, default=LOOP_INTERVAL_SEC, help="Interval in seconds between readings")
    parser.add_argument("--url", type=str, default=GATEWAY_URL, help="Gateway ingestion endpoint URL")
    parser.add_argument("--sensor", type=str, default=SENSOR_ID, help="Sensor ID")
    args = parser.parse_args()

    run_live_simulator(
        endpoint=args.url,
        sensor_id=args.sensor,
        interval_sec=args.interval,
        max_iterations=args.iterations,
    )

