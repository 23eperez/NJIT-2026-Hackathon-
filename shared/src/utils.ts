import type { Aircraft } from './types.js';

export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

// Haversine formula — returns distance in nautical miles
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
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

// Project an aircraft's position forward by deltaSeconds using heading/speed.
export function projectAircraftPosition(aircraft: Aircraft, deltaSeconds: number): Aircraft {
  const headingRad = degreesToRadians(aircraft.heading);
  const nmPerSec = aircraft.speed / 3600;
  const latRad = degreesToRadians(aircraft.latitude);

  const deltaLat = (nmPerSec * Math.cos(headingRad) / 60) * deltaSeconds;
  const deltaLon = (nmPerSec * Math.sin(headingRad) / (60 * Math.cos(latRad))) * deltaSeconds;

  return {
    ...aircraft,
    latitude: aircraft.latitude + deltaLat,
    longitude: aircraft.longitude + deltaLon,
    timestamp: Date.now(),
  };
}
