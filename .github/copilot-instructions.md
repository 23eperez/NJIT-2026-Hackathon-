<!-- Use this file to provide workspace-specific custom instructions to Copilot. -->

# Aircraft Conflict Detection Training System

## Project Overview
A web-based training system for air traffic controllers to handle aircraft conflicts faster. Features real-time visualization of aircraft positions, conflict detection algorithms, and interactive training scenarios.

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Visualization**: Canvas/WebGL for aircraft rendering
- **Detection Algorithm**: Geometric conflict detection with separation minima

## Project Structure
```
/
├── frontend/          # React app for visualization
├── backend/           # Express server for conflict detection
├── shared/            # Shared types and utilities
└── docs/              # Documentation
```

## Key Features
- Real-time aircraft position visualization
- Automatic conflict detection
- Interactive training scenarios
- Performance metrics and feedback
- Controller decision logging

## Development Commands
- `npm install` - Install dependencies
- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm test` - Run tests

## Safety Notes
- Ensure all conflict detection algorithms are validated
- Log all controller decisions for audit trail
- Display clear warnings for potential conflicts
