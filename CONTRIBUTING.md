# Contributing to Resonance

Welcome to the **Resonance** project! This guide explains how to contribute effectively to our acoustic and vibration anomaly-monitoring prototype.

## Development Principles

1. **Contract-First Development:** The authoritative event specification in [contracts/sensor-event.schema.json](file:///contracts/sensor-event.schema.json) dictates the boundary between Python, Node.js, and React. Never modify this contract without cross-tier consensus.
2. **Modular Independence:** Each module (`sensor_sim/`, `server/`, `client/`) has clear boundaries. Avoid cross-module coupling or altering another module's internal implementation.
3. **Reproducibility & Quality:** Every pull request must preserve passing contract tests and adhere to repository formatting.
4. **Safety & Ethics:** Resonance is a demonstration and prototype system. Do not market or represent it as certified crack detection or validated physical structural safety inspection software.

---

## Environment Prerequisites

- **Node.js:** v20.x or higher (tested on v24.x)
- **NPM:** v10.x or higher (tested on v11.x)
- **Python:** 3.11 or higher (tested on 3.13)
- **Git:** 2.x

---

## Quickstart

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd Resonance
   ```

2. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

3. **Install Python test dependencies:**
   ```bash
   pip install -r sensor_sim/requirements.txt
   ```

4. **Verify contract test suite:**
   ```bash
   npm run test:contract
   npm run validate:examples
   ```

---

## Commit Guidelines

We adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat(<module>):` A new feature (e.g., `feat(server): add Socket.IO event broadcaster`)
- `fix(<module>):` A bug fix (e.g., `fix(sensor_sim): clamp FFT frequency extraction`)
- `docs(<topic>):` Documentation improvements (e.g., `docs(api): document HTTP error responses`)
- `test(<scope>):` Adding or correcting tests (e.g., `test(contract): add negative timestamp tests`)
- `refactor(<module>):` Code restructuring without behavioral change

---

## Workflow & Code Review

Please review [docs/GIT_WORKFLOW.md](file:///docs/GIT_WORKFLOW.md) for branch naming conventions, staging reviews, and handoff procedures across sequential development phases.
