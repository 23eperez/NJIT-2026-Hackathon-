import type { Aircraft, Conflict, ConflictDetectionRequest, ConflictDetectionResponse } from '../../../shared/src/types.js';
import { calculateDistance, calculateVerticalSeparation, calculateTimeToClosestPoint } from '../../../shared/src/utils.js';

export class ConflictDetectionService {
  /**
   * Detect conflicts between aircraft
   */
  static detectConflicts(request: ConflictDetectionRequest): Conflict[] {
    const conflicts: Conflict[] = [];
    const { aircrafts, separationMinima } = request;

    // Check each pair of aircraft
    for (let i = 0; i < aircrafts.length; i++) {
      for (let j = i + 1; j < aircrafts.length; j++) {
        const conflict = this.checkPair(
          aircrafts[i],
          aircrafts[j],
          separationMinima.horizontal,
          separationMinima.vertical
        );

        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two aircraft are in conflict
   */
  private static checkPair(
    aircraft1: Aircraft,
    aircraft2: Aircraft,
    horizontalMinima: number,
    verticalMinima: number
  ): Conflict | null {
    // Calculate horizontal distance
    const horizontalDistance = calculateDistance(
      aircraft1.latitude,
      aircraft1.longitude,
      aircraft2.latitude,
      aircraft2.longitude
    );

    // Calculate vertical separation
    const verticalSeparation = calculateVerticalSeparation(
      aircraft1.altitude,
      aircraft2.altitude
    );

    // Check if both separations are violated
    if (horizontalDistance < horizontalMinima && verticalSeparation < verticalMinima) {
      const timeToCP = calculateTimeToClosestPoint(
        aircraft1.latitude,
        aircraft1.longitude,
        aircraft1.altitude,
        aircraft1.heading,
        aircraft1.speed,
        aircraft2.latitude,
        aircraft2.longitude,
        aircraft2.altitude,
        aircraft2.heading,
        aircraft2.speed
      );

      // Determine severity based on time to closest point and distance
      let severity: 'warning' | 'alert' | 'critical' = 'warning';
      if (timeToCP < 5 && horizontalDistance < horizontalMinima * 0.5) {
        severity = 'critical';
      } else if (timeToCP < 10) {
        severity = 'alert';
      }

      return {
        id: `${aircraft1.id}-${aircraft2.id}`,
        aircraft1: aircraft1.id,
        aircraft2: aircraft2.id,
        distance: horizontalDistance,
        timeToClosestPoint: timeToCP,
        minimumSeparation: horizontalMinima,
        severity,
        detectedAt: Date.now(),
      };
    }

    return null;
  }
}
