import { useState, useEffect, useCallback, useRef } from 'react';
import type { Aircraft, Conflict, ConflictDetectionRequest } from '../../shared/src/types.js';
import { projectAircraftPosition } from '../../shared/src/utils.js';
import { AircraftVisualization } from './components/AircraftVisualization';
import { ConflictPanel } from './components/ConflictPanel';
import { TimeDisplay } from './components/TimeDisplay';
import { SCENARIOS } from './scenarios';
import './App.css';

const API_BASE_URL = 'http://localhost:3001';

const DEFAULT_AIRCRAFT: Aircraft[] = [
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

function App() {
  const [aircrafts, setAircrafts]             = useState<Aircraft[]>(DEFAULT_AIRCRAFT);
  const [conflicts, setConflicts]             = useState<Conflict[]>([]);
  const [isSimulating, setIsSimulating]       = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [apiError, setApiError]               = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds]   = useState(0);
  const [hasEverRun, setHasEverRun]           = useState(false);

  // Ref so the interval callback always reads the latest aircraft state
  // without the interval needing to be recreated every render.
  const aircraftsRef = useRef<Aircraft[]>(DEFAULT_AIRCRAFT);
  useEffect(() => { aircraftsRef.current = aircrafts; }, [aircrafts]);

  const detectConflicts = useCallback(async (planes: Aircraft[]) => {
    try {
      const request: ConflictDetectionRequest = {
        aircrafts: planes,
        separationMinima: { horizontal: 5, vertical: 1000 },
      };
      const response = await fetch(`${API_BASE_URL}/api/detect-conflicts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (response.ok) {
        const data = await response.json();
        setConflicts(data.conflicts);
        setApiError(null);
      }
    } catch {
      setApiError('Backend unreachable — run: npm run dev -w backend');
    }
  }, []);

  // Initial conflict scan on mount
  useEffect(() => {
    detectConflicts(DEFAULT_AIRCRAFT);
  }, [detectConflicts]);

  // ── Simulation loop ────────────────────────────────────────────────────────
  // detectConflicts is intentionally called OUTSIDE the setAircrafts updater.
  // Calling async side-effects inside a state updater is unsafe in React 18
  // (updaters run twice in Strict Mode dev), causing double fetches and drift.
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);

      const updated = aircraftsRef.current.map((ac) => projectAircraftPosition(ac, 1));
      setAircrafts(updated);
      detectConflicts(updated);
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating, detectConflicts]);

  // ── Scenario / reset helpers ───────────────────────────────────────────────
  const loadScenario = (scenarioId: string) => {
    const scenario = SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) return;
    setIsSimulating(false);
    setElapsedSeconds(0);
    setHasEverRun(false);
    const planes = scenario.aircraft.map((a) => ({ ...a, timestamp: Date.now() }));
    setAircrafts(planes);
    aircraftsRef.current = planes;
    setConflicts([]);
    setSelectedConflict(null);
    setActiveScenarioId(scenarioId);
    detectConflicts(planes);
  };

  const resetToDefault = () => {
    setIsSimulating(false);
    setElapsedSeconds(0);
    setHasEverRun(false);
    const planes = DEFAULT_AIRCRAFT.map((a) => ({ ...a, timestamp: Date.now() }));
    setAircrafts(planes);
    aircraftsRef.current = planes;
    setConflicts([]);
    setSelectedConflict(null);
    setActiveScenarioId(null);
    detectConflicts(planes);
  };

  const handleSimToggle = () => {
    if (!isSimulating) setHasEverRun(true);
    setIsSimulating((v) => !v);
  };

  // ── Derived display values ─────────────────────────────────────────────────
  const simStatus = isSimulating
    ? 'SIMULATING'
    : hasEverRun
    ? 'PAUSED'
    : 'READY';

  const simButtonLabel = isSimulating
    ? '⏸  PAUSE'
    : hasEverRun
    ? '▶  RESUME'
    : '▶  RUN SIMULATION';

  const elapsedLabel =
    `T+${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}` +
    `:${String(elapsedSeconds % 60).padStart(2, '0')}`;

  const difficultyColor: Record<string, string> = {
    easy: '#00cc44',
    medium: '#ff9900',
    hard: '#ff3333',
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Aircraft Conflict Detection Training System</h1>
        <div className="header-info">
          <span>Aircraft: {aircrafts.length}</span>
          <span className={conflicts.length > 0 ? 'conflict-count-active' : ''}>
            Conflicts: {conflicts.length}
          </span>
          <span className={`status-badge status-${simStatus.toLowerCase()}`}>
            {simStatus}
          </span>
          <span className="elapsed-timer">{elapsedLabel}</span>
        </div>
      </header>

      <TimeDisplay elapsedSeconds={elapsedSeconds} isSimulating={isSimulating} />

      {apiError && <div className="api-error">{apiError}</div>}

      <div className="scenario-selector">
        <button
          className={`scenario-btn${activeScenarioId === null ? ' active' : ''}`}
          onClick={resetToDefault}
        >
          Default
        </button>
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            className={`scenario-btn${activeScenarioId === scenario.id ? ' active' : ''}`}
            onClick={() => loadScenario(scenario.id)}
          >
            {scenario.name}
            <span
              className="difficulty-badge"
              style={{ color: difficultyColor[scenario.difficulty] }}
            >
              {scenario.difficulty}
            </span>
          </button>
        ))}
      </div>

      <main className="app-main">
        <div className="visualization-section">
          <AircraftVisualization
            aircrafts={aircrafts}
            conflicts={conflicts}
            selectedConflict={selectedConflict}
          />
          <div className="controls-section">
            <button
              className={`sim-button${isSimulating ? ' running' : ''}`}
              onClick={handleSimToggle}
            >
              {simButtonLabel}
            </button>
            <button
              className="refresh-button"
              onClick={() => detectConflicts(aircrafts)}
              title="Re-run conflict detection on current positions"
            >
              ↺  Refresh Detection
            </button>
          </div>
        </div>

        <div className="conflicts-section">
          <ConflictPanel conflicts={conflicts} onConflictSelect={setSelectedConflict} />
        </div>
      </main>

      <footer className="app-footer">
        <p>Training Mode — For Educational Purposes Only</p>
      </footer>
    </div>
  );
}

export default App;
