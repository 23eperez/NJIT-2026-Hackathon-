import React, { useState, useEffect, useRef } from 'react';
import type { Aircraft, Conflict } from '../../../shared/src/types.js';
import './AirspaceVisualization.css';

interface Props {
  aircrafts: Aircraft[];
  conflicts: Conflict[];
}

export const AirspaceVisualization: React.FC<Props> = ({ aircrafts, conflicts }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height);

    // Draw conflicts
    conflicts.forEach(conflict => {
      const aircraft1 = aircrafts.find(a => a.id === conflict.aircraft1);
      const aircraft2 = aircrafts.find(a => a.id === conflict.aircraft2);

      if (aircraft1 && aircraft2) {
        drawConflictZone(ctx, aircraft1, aircraft2, conflict.severity);
      }
    });

    // Draw aircraft
    aircrafts.forEach(aircraft => {
      drawAircraft(ctx, aircraft);
    });

    // Draw labels
    aircrafts.forEach(aircraft => {
      drawLabel(ctx, aircraft);
    });
  }, [aircrafts, conflicts]);

  return (
    <div className="visualization-container">
      <h2>Airspace Visualization</h2>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="airspace-canvas"
      />
      <div className="legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#4CAF50' }}></span>
          <span>Aircraft</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#FFC107' }}></span>
          <span>Warning</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#FF5722' }}></span>
          <span>Critical</span>
        </div>
      </div>
    </div>
  );
};

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;

  for (let i = 0; i <= width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }

  for (let i = 0; i <= height; i += 50) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }
}

function drawAircraft(ctx: CanvasRenderingContext2D, aircraft: Aircraft) {
  const x = (aircraft.longitude + 180) * (800 / 360);
  const y = (90 - aircraft.latitude) * (600 / 180);

  // Draw aircraft symbol
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();

  // Draw heading indicator
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const headingRad = (aircraft.heading * Math.PI) / 180;
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.sin(headingRad) * 15, y - Math.cos(headingRad) * 15);
  ctx.stroke();
}

function drawLabel(ctx: CanvasRenderingContext2D, aircraft: Aircraft) {
  const x = (aircraft.longitude + 180) * (800 / 360);
  const y = (90 - aircraft.latitude) * (600 / 180);

  ctx.fillStyle = '#000';
  ctx.font = '12px Arial';
  ctx.fillText(`${aircraft.callsign}`, x + 8, y - 8);
  ctx.fillText(`${Math.round(aircraft.altitude / 100)}`, x + 8, y + 4);
}

function drawConflictZone(
  ctx: CanvasRenderingContext2D,
  aircraft1: Aircraft,
  aircraft2: Aircraft,
  severity: string
) {
  const x1 = (aircraft1.longitude + 180) * (800 / 360);
  const y1 = (90 - aircraft1.latitude) * (600 / 180);
  const x2 = (aircraft2.longitude + 180) * (800 / 360);
  const y2 = (90 - aircraft2.latitude) * (600 / 180);

  ctx.strokeStyle = severity === 'critical' ? '#FF5722' : '#FFC107';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
}
