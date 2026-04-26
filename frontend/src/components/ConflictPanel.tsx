import { useState, useEffect } from 'react';
import type { Conflict } from '../../../shared/src/types.js';
import './ConflictPanel.css';

interface ConflictPanelProps {
  conflicts: Conflict[];
  onConflictSelect: (conflictId: string) => void;
}

export const ConflictPanel: React.FC<ConflictPanelProps> = ({
  conflicts,
  onConflictSelect,
}) => {
  return (
    <div className="conflict-panel">
      <h3>Active Conflicts ({conflicts.length})</h3>
      <div className="conflict-list">
        {conflicts.length === 0 ? (
          <p className="no-conflicts">No active conflicts</p>
        ) : (
          conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className={`conflict-item conflict-${conflict.severity}`}
              onClick={() => onConflictSelect(conflict.id)}
            >
              <div className="conflict-header">
                <span className="severity-badge">{conflict.severity.toUpperCase()}</span>
                <span className="callsigns">
                  {conflict.aircraft1} ↔ {conflict.aircraft2}
                </span>
              </div>
              <div className="conflict-details">
                <span>Distance: {conflict.distance.toFixed(1)} nm</span>
                <span>Time to CP: {conflict.timeToClosestPoint.toFixed(1)} min</span>
                <span>Min Sep: {conflict.minimumSeparation.toFixed(1)} nm</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
