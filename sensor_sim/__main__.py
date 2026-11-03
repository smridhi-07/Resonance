"""
Resonance Sensor Simulator - Module Entrypoint
Allows executing: python -m sensor_sim or npm run sensor:run
"""
import os
import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from sensor_sim.simulate import run_live_simulator, GATEWAY_URL, SENSOR_ID, LOOP_INTERVAL_SEC

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
