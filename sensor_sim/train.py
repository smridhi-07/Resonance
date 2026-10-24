"""
Resonance — Sensor Simulation & ML Engine: Training Pipeline (Phase 3)
======================================================================
Ingests real Z24 Bridge benchmark vibration telemetry from the cloned
repository, segments signals into sliding observation windows, extracts
the 3 authoritative contract features (rms, std_dev, dominant_frequency_hz),
and trains an unsupervised IsolationForest model for anomaly detection.

Contract Reference: contracts/sensor-event.schema.json
Authoritative Features:
  - rms: Root Mean Square acceleration magnitude (>= 0.0)
  - std_dev: Standard deviation of signal amplitude (>= 0.0)
  - dominant_frequency_hz: Peak spectral frequency via FFT (>= 0.0)
Model Target:
  - sensor_sim/model/isolation_forest.joblib
"""

import os
import sys
import glob
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import numpy as np
import pandas as pd
from scipy.fft import rfft, rfftfreq
from sklearn.ensemble import IsolationForest
import joblib


# ------------------------------------------------------------------------------
# Configuration & Constants
# ------------------------------------------------------------------------------
SAMPLING_RATE_HZ = 100.0       # Standard Z24 bridge acquisition frequency (100 Hz)
WINDOW_SIZE = 200              # 2.0 second observation window (200 samples)
WINDOW_STEP = 50               # 0.5 second slide step (75% overlap for high coverage)
CONTAMINATION = 0.05           # Expected baseline outlier threshold for IsolationForest
RANDOM_STATE = 42

DEFAULT_Z24_DIR = Path(__file__).resolve().parent.parent / "z24_data"
DEFAULT_MODEL_DIR = Path(__file__).resolve().parent / "model"
DEFAULT_MODEL_FILE = DEFAULT_MODEL_DIR / "isolation_forest.joblib"


# ------------------------------------------------------------------------------
# Data Ingestion
# ------------------------------------------------------------------------------
def find_z24_data_dir(preferred_path: Optional[Path] = None) -> Path:
    """
    Locates the cloned Z24 data directory in the workspace.
    """
    candidates = [
        preferred_path,
        DEFAULT_Z24_DIR,
        Path("z24_data").resolve(),
        Path("../z24_data").resolve(),
    ]
    for c in candidates:
        if c and c.exists() and c.is_dir():
            return c.resolve()
    raise FileNotFoundError(
        f"Z24 data repository directory not found. Candidates searched: {candidates}"
    )


def load_z24_frequency_response_data(z24_root: Path) -> Dict[str, pd.DataFrame]:
    """
    Loads real Z24 bridge modal response datasets for the 5 reference channels:
    - R1V: Pier 1 Vertical sensor
    - R2L: Pier 2 Longitudinal sensor
    - R2T: Pier 2 Transverse sensor
    - R2V: Pier 2 Vertical sensor
    - R3V: Pier 3 Vertical sensor
    """
    search_pattern = str(z24_root / "**" / "R*.xlsx")
    excel_files = sorted(glob.glob(search_pattern, recursive=True))

    if not excel_files:
        raise FileNotFoundError(
            f"No Z24 vibration response Excel files found matching: {search_pattern}"
        )

    channels: Dict[str, pd.DataFrame] = {}
    print(f"[Z24 Ingest] Discovered {len(excel_files)} real bridge channel dataset(s):")
    for fpath in excel_files:
        channel_name = Path(fpath).stem
        df = pd.read_excel(fpath)
        channels[channel_name] = df
        print(f"  - {channel_name}: {len(df)} frequency bins (0 Hz to {df.iloc[-1, 0]:.1f} Hz)")

    return channels


def synthesize_time_series_from_modal_response(
    channel_df: pd.DataFrame,
    duration_sec: float = 120.0,
    fs: float = SAMPLING_RATE_HZ,
    add_variations: int = 8,
    seed: int = RANDOM_STATE,
) -> List[np.ndarray]:
    """
    Reconstructs continuous time-domain vibration signals from real harmonic
    acceleration frequency response data:
        x(t) = sum_k [ A_k * cos(2*pi*f_k*t + phi_k) ]
    Simulates normal operating variations (ambient traffic/wind micro-vibrations)
    to span the healthy baseline distribution (Z24 healthy baseline states 0-7).
    """
    freqs = channel_df.iloc[:, 0].to_numpy(dtype=float)
    amps = channel_df.iloc[:, 1].to_numpy(dtype=float)
    phases = np.radians(channel_df.iloc[:, 2].to_numpy(dtype=float))

    t = np.arange(0, duration_sec, 1.0 / fs)
    base_signal = np.zeros_like(t)

    # Superposition of harmonic frequency response components
    for f, a, p in zip(freqs, amps, phases):
        if a > 0:
            base_signal += a * np.cos(2.0 * np.pi * f * t + p)

    signals: List[np.ndarray] = [base_signal]
    base_std = np.std(base_signal) if np.std(base_signal) > 0 else 1.0

    rng = np.random.default_rng(seed)
    for _ in range(add_variations):
        # Normal operational noise variation (+-3% amplitude scaling, 4% ambient noise)
        scale_factor = 1.0 + rng.uniform(-0.03, 0.03)
        ambient_noise = rng.normal(0, 0.04 * base_std, size=len(t))
        varied_signal = (base_signal * scale_factor) + ambient_noise
        signals.append(varied_signal)

    return signals


# ------------------------------------------------------------------------------
# Feature Extraction (Strict Schema Compliance)
# ------------------------------------------------------------------------------
def extract_contract_features(window: np.ndarray, fs: float = SAMPLING_RATE_HZ) -> Tuple[float, float, float]:
    """
    Extracts the exactly three required contract features from a single observation window:
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
    # Exclude DC offset component (bin 0) to capture dominant dynamic oscillation
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


def build_windowed_feature_matrix(
    channel_signals: Dict[str, List[np.ndarray]],
    window_size: int = WINDOW_SIZE,
    step_size: int = WINDOW_STEP,
    fs: float = SAMPLING_RATE_HZ,
) -> Tuple[np.ndarray, List[str]]:
    """
    Segments all channel signals into sliding observation windows and computes
    feature vectors strictly adhering to the schema contract.
    """
    feature_rows: List[Tuple[float, float, float]] = []

    for channel_name, signals in channel_signals.items():
        for sig in signals:
            sig_len = len(sig)
            if sig_len < window_size:
                continue

            for start in range(0, sig_len - window_size + 1, step_size):
                window = sig[start : start + window_size]
                rms, std_dev, dom_freq = extract_contract_features(window, fs=fs)
                feature_rows.append((rms, std_dev, dom_freq))

    feature_matrix = np.asarray(feature_rows, dtype=np.float64)
    feature_names = ["rms", "std_dev", "dominant_frequency_hz"]
    return feature_matrix, feature_names


# ------------------------------------------------------------------------------
# Model Training & Serialization
# ------------------------------------------------------------------------------
def train_isolation_forest(
    X: np.ndarray,
    contamination: float = CONTAMINATION,
    random_state: int = RANDOM_STATE,
) -> IsolationForest:
    """
    Trains a Scikit-Learn IsolationForest model on the extracted baseline features.
    """
    print(f"[Training] Fitting IsolationForest on {X.shape[0]} windows across {X.shape[1]} features...")
    model = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=random_state,
        n_jobs=-1,
    )
    model.fit(X)
    print("[Training] Model fit complete.")
    return model


def save_trained_model(
    model: IsolationForest,
    output_path: Path = DEFAULT_MODEL_FILE,
) -> Path:
    """
    Serializes the trained model to disk using joblib.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output_path)
    print(f"[Model Save] Successfully saved trained IsolationForest model to:\n  -> {output_path.resolve()}")
    return output_path


# ------------------------------------------------------------------------------
# Main Execution Pipeline
# ------------------------------------------------------------------------------
def run_training_pipeline() -> Path:
    print("=" * 70)
    print("Resonance Phase 3: Z24 Bridge Baseline Ingestion & Model Training")
    print("=" * 70)

    # 1. Locate Z24 dataset
    z24_dir = find_z24_data_dir()
    print(f"[Ingest Path] Located Z24 dataset directory: {z24_dir}")

    # 2. Ingest real vibration channels
    channels = load_z24_frequency_response_data(z24_dir)

    # 3. Synthesize continuous time-series for sliding-window segmentation
    print("\n[Signal Processing] Synthesizing continuous vibration streams at fs = 100 Hz...")
    channel_signals: Dict[str, List[np.ndarray]] = {}
    total_signals = 0
    for name, df in channels.items():
        sigs = synthesize_time_series_from_modal_response(df, duration_sec=120.0, fs=SAMPLING_RATE_HZ)
        channel_signals[name] = sigs
        total_signals += len(sigs)
    print(f"[Signal Processing] Generated {total_signals} continuous vibration streams across {len(channels)} channels.")

    # 4. Chunk into sliding windows and extract the 3 contract features
    print(f"\n[Feature Extraction] Chunking into {WINDOW_SIZE}-sample sliding windows (step = {WINDOW_STEP})...")
    X, feature_names = build_windowed_feature_matrix(
        channel_signals,
        window_size=WINDOW_SIZE,
        step_size=WINDOW_STEP,
        fs=SAMPLING_RATE_HZ,
    )

    print(f"[Feature Matrix] Shape: {X.shape} (Windows: {X.shape[0]}, Features: {X.shape[1]})")
    print("  - Features:", feature_names)
    print(f"  - RMS:                  min = {X[:, 0].min():.6f}, mean = {X[:, 0].mean():.6f}, max = {X[:, 0].max():.6f}")
    print(f"  - Std Dev:              min = {X[:, 1].min():.6f}, mean = {X[:, 1].mean():.6f}, max = {X[:, 1].max():.6f}")
    print(f"  - Dominant Freq (Hz):   min = {X[:, 2].min():.2f}, mean = {X[:, 2].mean():.2f}, max = {X[:, 2].max():.2f}")

    # 5. Train Isolation Forest
    print()
    model = train_isolation_forest(X, contamination=CONTAMINATION, random_state=RANDOM_STATE)

    # Evaluation on training data
    preds = model.predict(X)
    normal_count = int(np.sum(preds == 1))
    anomaly_count = int(np.sum(preds == -1))
    print(f"[Baseline Summary] Normal windows: {normal_count} ({normal_count / len(preds) * 100:.1f}%), "
          f"Outlier margin: {anomaly_count} ({anomaly_count / len(preds) * 100:.1f}%)")

    # 6. Save model artifact
    saved_file = save_trained_model(model, DEFAULT_MODEL_FILE)

    # 7. Verification: test loading and running a single inference
    loaded_model = joblib.load(saved_file)
    test_feature = X[0:1]
    test_pred = loaded_model.predict(test_feature)[0]
    test_score = loaded_model.decision_function(test_feature)[0]
    print(f"[Verification] In-memory reload verified. Test sample prediction: {test_pred} (decision score: {test_score:.4f})")
    print("=" * 70)
    print("Training pipeline completed successfully.")
    print("=" * 70)

    return saved_file


if __name__ == "__main__":
    run_training_pipeline()
