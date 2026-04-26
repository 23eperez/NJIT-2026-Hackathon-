import type { Aircraft, Conflict, ConflictDetectionRequest } from '../../../shared/src/types.js';
import { degreesToRadians, calculateDistance } from '../../../shared/src/utils.js';

const LOOK_AHEAD_MINUTES = 15;

export class ConflictDetectionService {
  static detectConflicts(request: ConflictDetectionRequest): Conflict[] {
    const { aircrafts, separationMinima } = request;
    const conflicts: Conflict[] = [];

    for (let i = 0; i < aircrafts.length; i++) {
      for (let j = i + 1; j < aircrafts.length; j++) {
        const conflict = this.checkPairPredictive(
          aircrafts[i],
          aircrafts[j],
          separationMinima.horizontal,
          separationMinima.vertical
        );
        if (conflict) conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  // Analytical closest-approach check using local Cartesian approximation (NM).
  // Flags conflicts that will occur within LOOK_AHEAD_MINUTES even if separation
  // is not yet lost.
  private static checkPairPredictive(
    a1: Aircraft,
    a2: Aircraft,
    hMin: number,
    vMin: number
  ): Conflict | null {
    const cosLat = Math.cos(degreesToRadians((a1.latitude + a2.latitude) / 2));
    const dx = (a2.longitude - a1.longitude) * 60 * cosLat; // NM east
    const dy = (a2.latitude - a1.latitude) * 60;            // NM north

    const s1 = a1.speed / 60; // NM/min
    const s2 = a2.speed / 60;
    const h1 = degreesToRadians(a1.heading);
    const h2 = degreesToRadians(a2.heading);

    const dvx = s2 * Math.sin(h2) - s1 * Math.sin(h1);
    const dvy = s2 * Math.cos(h2) - s1 * Math.cos(h1);
    const vSq = dvx * dvx + dvy * dvy;

    // Time of closest horizontal approach (minutes)
    let tClosest = 0;
    if (vSq > 0.0001) {
      tClosest = -(dx * dvx + dy * dvy) / vSq;
    }

    // Already past closest approach — check current separation only
    if (tClosest < 0) tClosest = 0;
    // Beyond look-ahead window — no actionable conflict
    if (tClosest > LOOK_AHEAD_MINUTES) return null;

    // Projected position of a2 relative to a1 at TCA
    const dxT = dx + dvx * tClosest;
    const dyT = dy + dvy * tClosest;
    const minHorizDist = Math.sqrt(dxT * dxT + dyT * dyT);

    // Current horizontal distance
    const currentDist = calculateDistance(a1.latitude, a1.longitude, a2.latitude, a2.longitude);

    // Vertical separation (assume level flight)
    const vertSep = Math.abs(a1.altitude - a2.altitude);

    if (minHorizDist >= hMin || vertSep >= vMin) return null;

    let severity: 'warning' | 'alert' | 'critical';
    if (tClosest < 2 && minHorizDist < hMin * 0.5) {
      severity = 'critical';
    } else if (tClosest < 5) {
      severity = 'alert';
    } else {
      severity = 'warning';
    }

    return {
      id: `${a1.id}-${a2.id}`,
      aircraft1: a1.id,
      aircraft2: a2.id,
      distance: currentDist,
      predictedMinDistance: minHorizDist,
      timeToClosestPoint: tClosest,
      minimumSeparation: hMin,
      severity,
      detectedAt: Date.now(),
    };
  }
}
