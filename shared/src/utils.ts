import type { Aircraft } from './types.js';

export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculates the great-circle distance between two geographic points using
 * the Haversine formula on a spherical Earth model.
 *
 * The result is the shortest over-surface path (great circle), not a
 * straight-line or rhumb-line distance. A floating-point clamp on the
 * intermediate value `a` prevents `NaN` for antipodal or identical inputs.
 *
 * @param lat1 - Latitude of the first point in decimal degrees (−90 to 90).
 * @param lon1 - Longitude of the first point in decimal degrees (−180 to 180).
 * @param lat2 - Latitude of the second point in decimal degrees (−90 to 90).
 * @param lon2 - Longitude of the second point in decimal degrees (−180 to 180).
 * @returns Distance in nautical miles (≥ 0). Returns 0 for identical points
 *     and ~10 807 NM for antipodal points (half Earth circumference).
 *
 * @example
 * // Typical en-route separation check (NYC → BOS corridor)
 * calculateDistance(40.71, -74.01, 42.36, -71.06);
 * // → 165.5 NM
 *
 * @example
 * // Verify legal 5 NM horizontal separation minimum
 * calculateDistance(40.0, -74.0, 40.0, -73.891);
 * // → ~5.0 NM
 *
 * @example
 * // Same point — must return exactly 0, not NaN
 * calculateDistance(51.5, -0.1, 51.5, -0.1);
 * // → 0
 */
export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 3440.065;
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const safeA = Math.min(1, Math.max(0, a));
  return R * 2 * Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA));
}

export function calculateVerticalSeparation(alt1: number, alt2: number): number {
  return Math.abs(alt1 - alt2);
}

// Analytical time-to-closest-approach using local Cartesian approximation.
// Returns minutes; negative means already past closest approach.
export function calculateTimeToClosestPoint(
  lat1: number, lon1: number, _alt1: number, heading1: number, speed1: number,
  lat2: number, lon2: number, _alt2: number, heading2: number, speed2: number
): number {
  const cosLat = Math.cos(degreesToRadians((lat1 + lat2) / 2));
  const dx = (lon2 - lon1) * 60 * cosLat;  // NM
  const dy = (lat2 - lat1) * 60;           // NM

  const s1 = speed1 / 60; // NM/min
  const s2 = speed2 / 60;
  const h1 = degreesToRadians(heading1);
  const h2 = degreesToRadians(heading2);

  const dvx = s2 * Math.sin(h2) - s1 * Math.sin(h1);
  const dvy = s2 * Math.cos(h2) - s1 * Math.cos(h1);

  const vSq = dvx * dvx + dvy * dvy;
  if (vSq < 0.0001) return Infinity; // parallel tracks

  return -(dx * dvx + dy * dvy) / vSq;
}

/**
 * Projects an aircraft's geographic position forward in time using its
 * current heading and speed (equirectangular dead-reckoning with latitude
 * correction).
 *
 * Uses a flat-Earth approximation with a `cos(lat)` correction factor for
 * longitude, which is accurate to within ~1 NM for projections under 150 NM.
 * Latitude is clamped to ±89.9999° before trigonometry to prevent division
 * by near-zero `cos(lat)` at the poles.
 *
 * @param aircraft - Current aircraft state. Relevant fields:
 *     `latitude` (decimal degrees, −90 to 90),
 *     `longitude` (decimal degrees, −180 to 180),
 *     `heading` (degrees clockwise from true north, 0–360),
 *     `speed` (knots).
 * @param deltaSeconds - Time to project forward, in seconds. Negative values
 *     project backward along the track.
 * @returns A new `Aircraft` object with updated `latitude`, `longitude`, and
 *     `timestamp`. All other fields are copied from the input unchanged.
 *
 * @example
 * // Eastbound aircraft: latitude stays constant, longitude increases
 * projectAircraftPosition(
 *   { ...ac, latitude: 40.7, longitude: -74.0, heading: 90, speed: 450 },
 *   600  // 10 minutes
 * );
 * // → { latitude: ~40.7, longitude: ~-72.9, ... }
 *
 * @example
 * // Northbound aircraft at 300 kts for 1 minute
 * projectAircraftPosition(
 *   { ...ac, latitude: 51.0, longitude: -1.0, heading: 0, speed: 300 },
 *   60
 * );
 * // → { latitude: ~51.083, longitude: -1.0, ... }  (5 NM north)
 *
 * @example
 * // Zero speed — position is unchanged
 * projectAircraftPosition({ ...ac, speed: 0 }, 3600);
 * // → { latitude: ac.latitude, longitude: ac.longitude, ... }
 */
export function projectAircraftPosition(aircraft: Aircraft, deltaSeconds: number): Aircraft {
  const headingRad = degreesToRadians(aircraft.heading);
  const nmPerSec = aircraft.speed / 3600;
  const clampedLat = Math.max(-89.9999, Math.min(89.9999, aircraft.latitude));
  const latRad = degreesToRadians(clampedLat);
  const cosLat = Math.max(Math.abs(Math.cos(latRad)), 1e-10);

  const deltaLat = (nmPerSec * Math.cos(headingRad) / 60) * deltaSeconds;
  const deltaLon = (nmPerSec * Math.sin(headingRad) / (60 * cosLat)) * deltaSeconds;

  // Clamp latitude to valid geographic range
  const newLat = Math.max(-90, Math.min(90, aircraft.latitude + deltaLat));
  // Normalise longitude to (-180, 180] so Haversine and canvas mapping stay valid
  const rawLon = aircraft.longitude + deltaLon;
  const newLon = ((rawLon + 180) % 360 + 360) % 360 - 180;

  return {
    ...aircraft,
    latitude: newLat,
    longitude: newLon,
    timestamp: Date.now(),
  };
}
