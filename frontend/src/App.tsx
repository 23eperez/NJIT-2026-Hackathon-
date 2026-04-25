import { useState, useEffect } from 'react';
import type { Aircraft, Conflict, ConflictDetectionRequest } from '../../../shared/src/types.js';
import { AircraftVisualization } from './components/AircraftVisualization';
import { ConflictPanel } from './components/ConflictPanel';
import './App.css';

const API_BASE_URL = 'http://localhost:3001';

function App() {
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);

  // Initialize with sample aircraft
  useEffect(() => {
    const sampleAircrafts: Aircraft[] = [
      {
        id: 'ac1',
        callsign: 'AAL123',
        latitude: 40.7128,
        longitude: -74.006,
        altitude: 25000,
        heading: 90,
        speed: 450,
        timestamp: Date.now(),
      },
      {
        id: 'ac2',
        callsign: 'UAL456',
        latitude: 40.7138,
        longitude: -73.9,
        altitude: 25500,
        heading: 270,
        speed: 420,
        timestamp: Date.now(),
      },
      {
        id: 'ac3',
        callsign: 'DAL789',
        latitude: 40.6895,
        longitude: -74.1745,
        altitude: 15000,
        heading: 45,
        speed: 350,
        timestamp: Date.now(),
      },
    ];
    setAircrafts(sampleAircrafts);
    detectConflicts(sampleAircrafts);
  }, []);

  const detectConflicts = async (planes: Aircraft[]) => {
    try {
      const request: ConflictDetectionRequest = {
        aircrafts: planes,
        separationMinima: {
          horizontal: 5, // 5 nautical miles
          vertical: 1000, // 1000 feet
        },
      };

      const response = await fetch(`${API_BASE_URL}/api/detect-conflicts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const data = await response.json();
        setConflicts(data.conflicts);
      }
    } catch (error) {
      console.error('Error detecting conflicts:', error);
    }
  };

  const updateAircraftPositions = () => {
    const updatedAircrafts = aircrafts.map((aircraft) => ({
      ...aircraft,
      latitude: aircraft.latitude + (Math.random() - 0.5) * 0.01,
      longitude: aircraft.longitude + (Math.random() - 0.5) * 0.01,
      altitude: aircraft.altitude + (Math.random() - 0.5) * 100,
      timestamp: Date.now(),
    }));

    setAircrafts(updatedAircrafts);
    detectConflicts(updatedAircrafts);
  };

  const toggleSimulation = () => {
    setIsSimulating(!isSimulating);
  };

  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(updateAircraftPositions, 1000);
    return () => clearInterval(interval);
  }, [isSimulating, aircrafts]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Aircraft Conflict Detection Training System</h1>
        <div className="header-info">
          <span>Aircraft: {aircrafts.length}</span>
          <span>Conflicts: {conflicts.length}</span>
          <span>Status: {isSimulating ? 'SIMULATING' : 'PAUSED'}</span>
        </div>
      </header>

      <main className="app-main">
        <div className="visualization-section">
          <AircraftVisualization aircrafts={aircrafts} conflicts={conflicts} />
          <div className="controls-section">
            <button
              className={`sim-button ${isSimulating ? 'active' : ''}`}
              onClick={toggleSimulation}
            >
              {isSimulating ? 'Pause Simulation' : 'Start Simulation'}
            </button>
            <button className="refresh-button" onClick={() => detectConflicts(aircrafts)}>
              Refresh Detection
            </button>
          </div>
        </div>

        <div className="conflicts-section">
          <ConflictPanel
            conflicts={conflicts}
            onConflictSelect={setSelectedConflict}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>Training Mode - For Educational Purposes Only</p>
      </footer>
    </div>
  );
}

export default App;
