// Shared types for the aircraft conflict detection system

export interface Aircraft {
  id: string;
  callsign: string;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  speed: number;
  timestamp: number;
}

export interface Conflict {
  id: string;
  aircraft1: string;
  aircraft2: string;
  distance: number;              // current horizontal distance in NM
  predictedMinDistance: number;  // predicted minimum horizontal distance at TCA (NM)
  timeToClosestPoint: number;    // minutes until closest approach
  minimumSeparation: number;     // required separation minima in NM
  severity: 'warning' | 'alert' | 'critical';
  detectedAt: number;
}

export interface ControllerInstruction {
  aircraftId: string;
  type: 'heading' | 'altitude' | 'speed';
  value: number;
  issuedAt: number;
}

export interface PrebuiltScenario {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;       // seconds
  centerLat: number;
  centerLon: number;
  radarRange: number;     // NM
  aircraft: Aircraft[];
  objectives: string[];
}

// Legacy types kept for backward compatibility
export interface TrainingScenario {
  id: string;
  name: string;
  description: string;
  aircrafts: Aircraft[];
  conflicts: Conflict[];
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
}

export interface ControllerAction {
  id: string;
  scenarioId: string;
  controllerId: string;
  action: string;
  timestamp: number;
  result: 'success' | 'partial' | 'failed';
}

export interface ConflictDetectionRequest {
  aircrafts: Aircraft[];
  separationMinima: {
    horizontal: number; // nautical miles
    vertical: number;   // feet
  };
}

export interface ConflictDetectionResponse {
  conflicts: Conflict[];
  processingTime: number;
}
