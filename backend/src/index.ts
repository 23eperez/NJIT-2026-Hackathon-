import express from 'express';
import cors from 'cors';
import type { ConflictDetectionRequest } from '../../../shared/src/types.js';
import { ConflictDetectionService } from './conflictDetection.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Conflict detection — now uses predictive look-ahead
app.post('/api/detect-conflicts', (req, res) => {
  try {
    const request: ConflictDetectionRequest = req.body;

    if (!request.aircrafts || !Array.isArray(request.aircrafts)) {
      return res.status(400).json({ error: 'Invalid request: aircrafts array required' });
    }
    if (!request.separationMinima) {
      return res.status(400).json({ error: 'Invalid request: separationMinima required' });
    }

    const startTime = Date.now();
    const conflicts = ConflictDetectionService.detectConflicts(request);
    const processingTime = Date.now() - startTime;

    return res.json({ conflicts, processingTime });
  } catch (error) {
    console.error('Error detecting conflicts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Scenario metadata (aircraft data lives in the frontend for low-latency sim)
app.get('/api/scenarios', (_req, res) => {
  res.json([
    {
      id: 'scenario-1',
      name: 'Head-On Conflict',
      description: 'Two aircraft on directly opposing headings at the same altitude',
      difficulty: 'easy',
      duration: 600,
    },
    {
      id: 'scenario-2',
      name: 'Crossing Paths',
      description: 'Two aircraft on intersecting tracks at the same altitude',
      difficulty: 'medium',
      duration: 720,
    },
    {
      id: 'scenario-3',
      name: 'Overtake Conflict',
      description: 'A faster aircraft closing on a slower one along the same route',
      difficulty: 'medium',
      duration: 600,
    },
    {
      id: 'scenario-4',
      name: 'Multiple Simultaneous Conflicts',
      description: 'Two independent conflicts — prioritize and resolve under pressure',
      difficulty: 'hard',
      duration: 900,
    },
  ]);
});

app.listen(PORT, () => {
  console.log(`Conflict Detection API listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
