import { describe, it, expect } from 'vitest';
import { calculateDistance, projectAircraftPosition } from './utils.js';
import type { Aircraft } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAircraft(overrides: Partial<Aircraft> = {}): Aircraft {
  return {
    id: 'test-ac',
    callsign: 'TST001',
    latitude: 40.71,
    longitude: -74.01,
    altitude: 25000,
    heading: 90,
    speed: 450,
    timestamp: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateDistance
// ---------------------------------------------------------------------------

describe('calculateDistance', () => {
  // --- REGRESSION: CRITICAL bug fixes ---

  it('returns 0 for identical points (not NaN — guards the a=0 path)', () => {
    const d = calculateDistance(40.71, -74.01, 40.71, -74.01);
    expect(d).toBe(0);
    expect(Number.isFinite(d)).toBe(true);
  });

  it('returns a finite number for antipodal points (guards the a≈1 floating-point NaN path)', () => {
    // Antipodal of (0, 0) is (0, 180). Haversine can yield a = 1 + ε here,
    // causing sqrt(1-a) = NaN without the safeA clamp.
    const d = calculateDistance(0, 0, 0, 180);
    expect(Number.isFinite(d)).toBe(true);
    // Half Earth circumference: π × 3440.065 = 10,807.3 NM
    expect(d).toBeCloseTo(10807.3, 0);
  });

  it('returns a finite number for near-identical points that trigger floating-point a > 1', () => {
    // These coordinates are intentionally chosen to exercise the epsilon path —
    // a point and a point 1 mm away where floating-point sin²/cos products
    // can round a to 1 + 2e-16.
    const lat = 51.4778;
    const d = calculateDistance(lat, 0, lat, 1e-10);
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThanOrEqual(0);
  });

  // --- Happy path ---

  it.each([
    {
      name: 'NYC to BOS (en-route separation check)',
      lat1: 40.71, lon1: -74.01,
      lat2: 42.36, lon2: -71.06,
      expected: 165.5,   // verified: Haversine yields 165.49 NM
      tolerance: 1,
    },
    {
      name: 'Standard 5 NM separation (legal minimum)',
      // At lat 40°: 5 NM east = 5 / (cos(40°) × 60) = 0.1088° lon
      lat1: 40.0,  lon1: -74.0,
      lat2: 40.0,  lon2: -73.8912,
      expected: 5.0,
      tolerance: 0.05,
    },
    {
      name: 'Equatorial N→S crossing',
      lat1: 1.0,  lon1: 0.0,
      lat2: -1.0, lon2: 0.0,
      expected: 120.0,
      tolerance: 0.5,
    },
  ])('$name — result within tolerance', ({ lat1, lon1, lat2, lon2, expected, tolerance }) => {
    const d = calculateDistance(lat1, lon1, lat2, lon2);
    expect(d).toBeCloseTo(expected, -Math.log10(tolerance));
    expect(Number.isFinite(d)).toBe(true);
  });

  it('handles antimeridian crossing (short path, not the long way around)', () => {
    // 0.2° lon at lat 51.5°: cos(51.5°) × 0.2 × 60 = 7.5 NM (not ~21,600 NM long way around)
    const d = calculateDistance(51.5, 179.9, 51.5, -179.9);
    expect(d).toBeCloseTo(7.5, 0);
    expect(d).toBeLessThan(100);
  });
});

// ---------------------------------------------------------------------------
// projectAircraftPosition
// ---------------------------------------------------------------------------

describe('projectAircraftPosition', () => {
  // --- REGRESSION: CRITICAL bug fixes ---

  it('returns finite coordinates at the geographic north pole (guards polar cos≈0 division)', () => {
    const ac = makeAircraft({ latitude: 90.0, heading: 90, speed: 450 });
    const projected = projectAircraftPosition(ac, 60);
    expect(Number.isFinite(projected.latitude)).toBe(true);
    expect(Number.isFinite(projected.longitude)).toBe(true);
    // Longitude must not blow up to Infinity or NaN
    expect(Math.abs(projected.longitude)).toBeLessThan(1e6);
  });

  it('returns finite coordinates at the geographic south pole', () => {
    const ac = makeAircraft({ latitude: -90.0, heading: 180, speed: 450 });
    const projected = projectAircraftPosition(ac, 60);
    expect(Number.isFinite(projected.latitude)).toBe(true);
    expect(Number.isFinite(projected.longitude)).toBe(true);
  });

  it('returns finite coordinates for lat exactly at the ±90 boundary', () => {
    for (const lat of [90, -90, 89.9999, -89.9999]) {
      const ac = makeAircraft({ latitude: lat, heading: 45, speed: 500 });
      const projected = projectAircraftPosition(ac, 300);
      expect(Number.isFinite(projected.latitude), `lat=${lat}`).toBe(true);
      expect(Number.isFinite(projected.longitude), `lat=${lat}`).toBe(true);
    }
  });

  // --- Happy path ---

  it.each([
    {
      name: 'due east — latitude unchanged, longitude increases',
      heading: 90,
      expectLatDelta: 0,
      expectLonSign: +1,
    },
    {
      name: 'due north — longitude unchanged, latitude increases',
      heading: 0,
      expectLatDelta: +1,
      expectLonSign: 0,
    },
    {
      name: 'due south — longitude unchanged, latitude decreases',
      heading: 180,
      expectLatDelta: -1,
      expectLonSign: 0,
    },
  ])('$name', ({ heading, expectLatDelta, expectLonSign }) => {
    const ac = makeAircraft({ latitude: 40.0, longitude: -74.0, heading, speed: 450 });
    const p = projectAircraftPosition(ac, 600); // 10 minutes

    if (expectLatDelta === 0)  expect(p.latitude).toBeCloseTo(ac.latitude, 4);
    if (expectLatDelta === +1) expect(p.latitude).toBeGreaterThan(ac.latitude);
    if (expectLatDelta === -1) expect(p.latitude).toBeLessThan(ac.latitude);

    if (expectLonSign === 0)   expect(p.longitude).toBeCloseTo(ac.longitude, 4);
    if (expectLonSign === +1)  expect(p.longitude).toBeGreaterThan(ac.longitude);
  });

  it('projects eastbound 450 kts for 10 min to ~75 NM east', () => {
    const ac = makeAircraft({ latitude: 40.0, longitude: -74.0, heading: 90, speed: 450 });
    const p = projectAircraftPosition(ac, 600);
    // 450 kts × 10/60 hr = 75 NM; at 40° lat: 1° lon ≈ 46 NM → ~1.63° shift
    const dist = calculateDistance(ac.latitude, ac.longitude, p.latitude, p.longitude);
    expect(dist).toBeCloseTo(75, 1);
  });

  it('returns the same position when speed is 0', () => {
    const ac = makeAircraft({ speed: 0 });
    const p = projectAircraftPosition(ac, 600);
    expect(p.latitude).toBeCloseTo(ac.latitude, 10);
    expect(p.longitude).toBeCloseTo(ac.longitude, 10);
  });

  it('updates timestamp on every projection', () => {
    const ac = makeAircraft({ timestamp: 0 });
    const p = projectAircraftPosition(ac, 1);
    expect(p.timestamp).toBeGreaterThan(0);
  });

  // --- REGRESSION: output normalisation ---

  it('output latitude never exceeds ±90 after many northbound ticks', () => {
    // Aircraft at 89° heading north — without clamping, lat would exceed 90
    let ac = makeAircraft({ latitude: 89.5, heading: 0, speed: 600 });
    for (let i = 0; i < 120; i++) ac = projectAircraftPosition(ac, 60);
    expect(ac.latitude).toBeLessThanOrEqual(90);
    expect(ac.latitude).toBeGreaterThanOrEqual(-90);
  });

  it('output longitude stays in (-180, 180] after crossing the antimeridian eastbound', () => {
    // Aircraft near the date line heading east — without wrapping, lon would exceed 180
    let ac = makeAircraft({ latitude: 40.0, longitude: 179.0, heading: 90, speed: 600 });
    for (let i = 0; i < 60; i++) ac = projectAircraftPosition(ac, 60);
    expect(ac.longitude).toBeGreaterThan(-180);
    expect(ac.longitude).toBeLessThanOrEqual(180);
  });

  it('output longitude stays in (-180, 180] after crossing the antimeridian westbound', () => {
    let ac = makeAircraft({ latitude: 40.0, longitude: -179.0, heading: 270, speed: 600 });
    for (let i = 0; i < 60; i++) ac = projectAircraftPosition(ac, 60);
    expect(ac.longitude).toBeGreaterThan(-180);
    expect(ac.longitude).toBeLessThanOrEqual(180);
  });
});
