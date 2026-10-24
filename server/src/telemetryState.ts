/**
 * In-Memory Telemetry State Manager
 *
 * Enforces runtime deduplication and per-sensor sequence monotonicity.
 * Note: This in-memory state resets upon server restart and is scoped to a single
 * node instance. Multi-instance production deployments require a distributed store (e.g., Redis).
 */

import type { ResonanceSensorEvent } from './types.js';

export interface StateCheckResult {
  accepted: boolean;
  reason?: string;
  previousSequence?: number;
}

export class TelemetryStateManager {
  private seenEventIds = new Set<string>();
  private latestSensorSequences = new Map<string, number>();

  // Async lock to ensure absolute serialization for concurrent asynchronous workflows
  private lockPromise: Promise<void> = Promise.resolve();

  /**
   * Acquires an async mutex lock to guarantee serialized execution across concurrent requests.
   */
  private async acquireLock(): Promise<() => void> {
    let release: () => void = () => {};
    const currentLock = this.lockPromise;
    this.lockPromise = new Promise<void>((resolve) => {
      release = resolve;
    });
    await currentLock;
    return release;
  }

  /**
   * Evaluates event_id uniqueness and per-sensor sequence monotonicity,
   * committing state atomically only if all checks pass.
   */
  public async evaluateAndCommit(
    event: ResonanceSensorEvent,
    onAccept?: () => Promise<void> | void
  ): Promise<StateCheckResult> {
    const release = await this.acquireLock();
    try {
      // 1. Check for duplicate event_id
      if (this.seenEventIds.has(event.event_id)) {
        return {
          accepted: false,
          reason: `Duplicate event_id "${event.event_id}" rejected. Each event_id must be unique across all streams.`,
        };
      }

      // 2. Check per-sensor sequence progression
      const lastSequence = this.latestSensorSequences.get(event.sensor_id);
      if (lastSequence !== undefined && event.sequence <= lastSequence) {
        return {
          accepted: false,
          reason: `Invalid sequence ${event.sequence} for sensor "${event.sensor_id}". Sequence must be strictly greater than last accepted sequence (${lastSequence}).`,
          previousSequence: lastSequence,
        };
      }

      // Execute acceptance hook if provided (e.g. broadcasting before releasing state lock)
      if (onAccept) {
        await onAccept();
      }

      // 3. Commit state atomically
      this.seenEventIds.add(event.event_id);
      this.latestSensorSequences.set(event.sensor_id, event.sequence);

      return {
        accepted: true,
        previousSequence: lastSequence,
      };
    } finally {
      release();
    }
  }

  /**
   * Returns the latest accepted sequence for a given sensor_id.
   */
  public getLatestSequence(sensorId: string): number | undefined {
    return this.latestSensorSequences.get(sensorId);
  }

  /**
   * Checks whether an event_id has been accepted.
   */
  public hasEvent(eventId: string): boolean {
    return this.seenEventIds.has(eventId);
  }

  /**
   * Returns current telemetry counts.
   */
  public getStats() {
    return {
      totalAcceptedEvents: this.seenEventIds.size,
      activeSensors: this.latestSensorSequences.size,
    };
  }

  /**
   * Resets all in-memory state. Used for test isolation.
   */
  public reset(): void {
    this.seenEventIds.clear();
    this.latestSensorSequences.clear();
    this.lockPromise = Promise.resolve();
  }
}
