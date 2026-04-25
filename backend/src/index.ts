import express from 'express';
import cors from 'cors';
import type { ConflictDetectionRequest } from '../../../shared/src/types.js';
import { ConflictDetectionService } from './conflictDetection.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Conflict detection endpoint
app.post('/api/detect-conflicts', (req, res) => {
  try {
    const request: ConflictDetectionRequest = req.body;
    
    // Validate request
    if (!request.aircrafts || !Array.isArray(request.aircrafts)) {
      return res.status(400).json({ error: 'Invalid request: aircrafts array required' });
    }

    if (!request.separationMinima) {
      return res.status(400).json({ error: 'Invalid request: separationMinima required' });
    }

    const startTime = Date.now();
    const conflicts = ConflictDetectionService.detectConflicts(request);
    const processingTime = Date.now() - startTime;

    res.json({
      conflicts,
      processingTime,
    });
  } catch (error) {
    console.error('Error detecting conflicts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sample scenarios endpoint
app.get('/api/scenarios', (req, res) => {
  res.json([
    {
      id: 'scenario-1',
      name: 'Basic Conflict',
      description: 'Two aircraft on converging paths',
      difficulty: 'easy',
      duration: 300,
    },
    {
      id: 'scenario-2',
      name: 'Multiple Conflicts',
      description: 'Handle multiple simultaneous conflicts',
      difficulty: 'medium',
      duration: 600,
    },
    {
      id: 'scenario-3',
      name: 'Complex Airspace',
      description: 'Dense traffic with multiple conflicts',
      difficulty: 'hard',
      duration: 900,
    },
  ]);
});

app.listen(PORT, () => {
  console.log(`Conflict Detection API listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
