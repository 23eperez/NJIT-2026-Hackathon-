// Shared utility functions

export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

// Calculate distance between two coordinates using Haversine formula
// Returns distance in nautical miles
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3440.065; // Earth's radius in nautical miles
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate vertical separation in feet
export function calculateVerticalSeparation(alt1: number, alt2: number): number {
  return Math.abs(alt1 - alt2);
}

// Calculate time to closest point between two aircraft
export function calculateTimeToClosestPoint(
  lat1: number,
  lon1: number,
  alt1: number,
  heading1: number,
  speed1: number,
  lat2: number,
  lon2: number,
  alt2: number,
  heading2: number,
  speed2: number
): number {
  // Simplified calculation - returns time in minutes
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  const avgSpeed = (speed1 + speed2) / 2;
  return distance / avgSpeed * 60; // Convert to minutes
}
