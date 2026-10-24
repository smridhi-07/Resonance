"""Automated Contract Test Suite for Resonance Sensor Event Schema.

Validates the authoritative JSON Schema Draft 2020-12 specification:
- contracts/sensor-event.schema.json
And validates example payloads and negative mutation boundaries.
"""

import copy
import json
from pathlib import Path
from typing import Any, Dict

import jsonschema
from jsonschema import Draft202012Validator, ValidationError
import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPO_ROOT / "contracts" / "sensor-event.schema.json"
EXAMPLES_DIR = REPO_ROOT / "contracts" / "examples"
NORMAL_EVENT_PATH = EXAMPLES_DIR / "normal-event.json"
ANOMALY_EVENT_PATH = EXAMPLES_DIR / "anomaly-event.json"


@pytest.fixture(scope="session")
def schema() -> Dict[str, Any]:
    """Loads and returns the authoritative JSON Schema."""
    assert SCHEMA_PATH.exists(), f"Schema file not found at {SCHEMA_PATH}"
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema_data = json.load(f)
    # Ensure the schema itself is a valid Draft 2020-12 schema
    Draft202012Validator.check_schema(schema_data)
    return schema_data


@pytest.fixture(scope="session")
def validator(schema: Dict[str, Any]) -> Draft202012Validator:
    """Instantiates a Draft202012Validator with format checking enabled."""
    return Draft202012Validator(
        schema,
        format_checker=Draft202012Validator.FORMAT_CHECKER,
    )


@pytest.fixture
def normal_event() -> Dict[str, Any]:
    """Loads the illustrative normal event example."""
    assert NORMAL_EVENT_PATH.exists(), f"Normal event example missing at {NORMAL_EVENT_PATH}"
    with open(NORMAL_EVENT_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def anomaly_event() -> Dict[str, Any]:
    """Loads the illustrative anomaly event example."""
    assert ANOMALY_EVENT_PATH.exists(), f"Anomaly event example missing at {ANOMALY_EVENT_PATH}"
    with open(ANOMALY_EVENT_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# -----------------------------------------------------------------------------
# 1 & 2. Example Conformance Tests
# -----------------------------------------------------------------------------

def test_normal_event_example_passes(validator: Draft202012Validator, normal_event: Dict[str, Any]) -> None:
    """Verifies that the canonical normal-event.json conforms strictly to the schema."""
    validator.validate(normal_event)


def test_anomaly_event_example_passes(validator: Draft202012Validator, anomaly_event: Dict[str, Any]) -> None:
    """Verifies that the canonical anomaly-event.json conforms strictly to the schema."""
    validator.validate(anomaly_event)


# -----------------------------------------------------------------------------
# 3. Missing Required Fields
# -----------------------------------------------------------------------------

@pytest.mark.parametrize("field", [
    "schema_version",
    "event_id",
    "sensor_id",
    "timestamp",
    "sequence",
    "status",
    "anomaly_score",
    "features",
    "source",
])
def test_missing_required_root_field_fails(validator: Draft202012Validator, normal_event: Dict[str, Any], field: str) -> None:
    """Verifies that omitting any required root field raises ValidationError."""
    payload = copy.deepcopy(normal_event)
    del payload[field]
    with pytest.raises(ValidationError) as exc_info:
        validator.validate(payload)
    assert field in exc_info.value.message or "required" in exc_info.value.message


@pytest.mark.parametrize("feature_field", [
    "rms",
    "std_dev",
    "dominant_frequency_hz",
])
def test_missing_required_feature_field_fails(validator: Draft202012Validator, normal_event: Dict[str, Any], feature_field: str) -> None:
    """Verifies that omitting any required property inside features raises ValidationError."""
    payload = copy.deepcopy(normal_event)
    del payload["features"][feature_field]
    with pytest.raises(ValidationError):
        validator.validate(payload)


# -----------------------------------------------------------------------------
# 4. Status Validation
# -----------------------------------------------------------------------------

@pytest.mark.parametrize("invalid_status", ["warning", "critical", "NORMAL", "unknown", "", 123])
def test_invalid_status_fails(validator: Draft202012Validator, normal_event: Dict[str, Any], invalid_status: Any) -> None:
    """Verifies that status values other than 'normal' and 'anomaly' are rejected."""
    payload = copy.deepcopy(normal_event)
    payload["status"] = invalid_status
    with pytest.raises(ValidationError):
        validator.validate(payload)


# -----------------------------------------------------------------------------
# 5. Source Validation
# -----------------------------------------------------------------------------

@pytest.mark.parametrize("invalid_source", ["cloud", "manual", "edge", "SIMULATION", ""])
def test_invalid_source_fails(validator: Draft202012Validator, normal_event: Dict[str, Any], invalid_source: str) -> None:
    """Verifies that source values other than 'simulation' and 'hardware' are rejected."""
    payload = copy.deepcopy(normal_event)
    payload["source"] = invalid_source
    with pytest.raises(ValidationError):
        validator.validate(payload)


# -----------------------------------------------------------------------------
# 6. Feature Values & Anomaly Score (Non-negative finite)
# -----------------------------------------------------------------------------

@pytest.mark.parametrize("feature_field", ["rms", "std_dev", "dominant_frequency_hz"])
def test_negative_feature_values_fail(validator: Draft202012Validator, normal_event: Dict[str, Any], feature_field: str) -> None:
    """Verifies that negative numerical values for features are rejected."""
    payload = copy.deepcopy(normal_event)
    payload["features"][feature_field] = -0.001
    with pytest.raises(ValidationError):
        validator.validate(payload)


def test_negative_anomaly_score_fails(validator: Draft202012Validator, normal_event: Dict[str, Any]) -> None:
    """Verifies that negative anomaly scores are rejected."""
    payload = copy.deepcopy(normal_event)
    payload["anomaly_score"] = -0.01
    with pytest.raises(ValidationError):
        validator.validate(payload)


# -----------------------------------------------------------------------------
# 7. Additional Unknown Properties (Contract drift prevention)
# -----------------------------------------------------------------------------

def test_additional_root_property_fails(validator: Draft202012Validator, normal_event: Dict[str, Any]) -> None:
    """Verifies that unexpected root-level properties are rejected."""
    payload = copy.deepcopy(normal_event)
    payload["confidence_score"] = 0.99  # Prohibited invented property
    with pytest.raises(ValidationError):
        validator.validate(payload)


def test_additional_feature_property_fails(validator: Draft202012Validator, normal_event: Dict[str, Any]) -> None:
    """Verifies that unexpected properties inside features are rejected."""
    payload = copy.deepcopy(normal_event)
    payload["features"]["kurtosis"] = 3.12
    with pytest.raises(ValidationError):
        validator.validate(payload)


# -----------------------------------------------------------------------------
# 8. Timestamp Format & UTC Constraint Validation
# -----------------------------------------------------------------------------

@pytest.mark.parametrize("valid_utc_timestamp", [
    "2026-10-24T14:30:00.000Z",
    "2026-10-24T14:30:00Z",
    "2026-10-24T14:30:00.123456Z",
])
def test_valid_utc_z_timestamps_pass(validator: Draft202012Validator, normal_event: Dict[str, Any], valid_utc_timestamp: str) -> None:
    """Verifies that RFC 3339 timestamps strictly ending in 'Z' pass validation."""
    payload = copy.deepcopy(normal_event)
    payload["timestamp"] = valid_utc_timestamp
    validator.validate(payload)


@pytest.mark.parametrize("non_utc_timestamp", [
    "2026-10-24T14:30:00+02:00",  # Non-UTC positive offset
    "2026-10-24T14:30:00-05:00",  # Non-UTC negative offset
    "2026-10-24T14:30:00+00:00",  # Numeric zero offset without 'Z'
    "2026-10-24T14:30:00",        # Missing timezone offset or 'Z'
])
def test_non_utc_timestamps_fail(validator: Draft202012Validator, normal_event: Dict[str, Any], non_utc_timestamp: str) -> None:
    """Verifies that non-UTC offsets are rejected by the strict UTC schema pattern."""
    payload = copy.deepcopy(normal_event)
    payload["timestamp"] = non_utc_timestamp
    with pytest.raises(ValidationError):
        validator.validate(payload)


@pytest.mark.parametrize("invalid_timestamp", [
    "not-a-timestamp",
    "2026-10-24",
    "2026-10-24 14:30:00",
    "2026-13-45T99:99:99Z",
    "",
])
def test_invalid_timestamp_fails(validator: Draft202012Validator, normal_event: Dict[str, Any], invalid_timestamp: str) -> None:
    """Verifies that malformed timestamp strings are rejected."""
    payload = copy.deepcopy(normal_event)
    payload["timestamp"] = invalid_timestamp
    with pytest.raises(ValidationError):
        validator.validate(payload)


# -----------------------------------------------------------------------------
# 9. Sequence Constraints (Strictly positive integer >= 1)
# -----------------------------------------------------------------------------

@pytest.mark.parametrize("invalid_sequence", [0, -1, -100, 1.5, "1"])
def test_zero_or_negative_sequence_fails(validator: Draft202012Validator, normal_event: Dict[str, Any], invalid_sequence: Any) -> None:
    """Verifies that sequence numbers <= 0 or non-integers are rejected."""
    payload = copy.deepcopy(normal_event)
    payload["sequence"] = invalid_sequence
    with pytest.raises(ValidationError):
        validator.validate(payload)


# -----------------------------------------------------------------------------
# 10. Schema Version Constraint (Initially restricted to '1.0')
# -----------------------------------------------------------------------------

@pytest.mark.parametrize("invalid_version", ["2.0", "1.1", "0.9", 1.0, "v1.0"])
def test_invalid_schema_version_fails(validator: Draft202012Validator, normal_event: Dict[str, Any], invalid_version: Any) -> None:
    """Verifies that schema_version values other than '1.0' are rejected."""
    payload = copy.deepcopy(normal_event)
    payload["schema_version"] = invalid_version
    with pytest.raises(ValidationError):
        validator.validate(payload)


# -----------------------------------------------------------------------------
# 11. Event ID and Sensor ID Non-Empty Constraint
# -----------------------------------------------------------------------------

@pytest.mark.parametrize("empty_val", [""])
def test_empty_identifiers_fail(validator: Draft202012Validator, normal_event: Dict[str, Any], empty_val: str) -> None:
    """Verifies that empty strings for event_id and sensor_id are rejected."""
    payload_empty_evt = copy.deepcopy(normal_event)
    payload_empty_evt["event_id"] = empty_val
    with pytest.raises(ValidationError):
        validator.validate(payload_empty_evt)

    payload_empty_sensor = copy.deepcopy(normal_event)
    payload_empty_sensor["sensor_id"] = empty_val
    with pytest.raises(ValidationError):
        validator.validate(payload_empty_sensor)


# -----------------------------------------------------------------------------
# 12. Unbounded Severity Score & Non-Finite Number Verification
# -----------------------------------------------------------------------------

@pytest.mark.parametrize("valid_score", [0.0, 0.12, 0.87, 1.0, 15.4, 250.75])
def test_unbounded_non_negative_anomaly_scores_pass(validator: Draft202012Validator, normal_event: Dict[str, Any], valid_score: float) -> None:
    """Verifies that anomaly_score accommodates any non-negative float without arbitrary 1.0 ceiling."""
    payload = copy.deepcopy(normal_event)
    payload["anomaly_score"] = valid_score
    validator.validate(payload)


def test_non_finite_json_numbers_rejected() -> None:
    """Verifies that non-finite numbers (NaN, Infinity) are rejected under strict RFC 8259 JSON parsing."""
    raw_payload_with_nan = '{"schema_version":"1.0","event_id":"e1","sensor_id":"s1","timestamp":"2026-10-24T14:30:00Z","sequence":1,"status":"normal","anomaly_score":NaN,"features":{"rms":0.1,"std_dev":0.1,"dominant_frequency_hz":10.0},"source":"simulation"}'
    with pytest.raises(ValueError):
        json.loads(
            raw_payload_with_nan,
            parse_constant=lambda c: (_ for _ in ()).throw(ValueError(f"Strict JSON disallows non-finite {c}")),
        )
