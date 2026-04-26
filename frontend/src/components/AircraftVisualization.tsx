import { useEffect, useRef, useState } from 'react';
import type { Aircraft, Conflict } from '../../../shared/src/types.js';
import './AircraftVisualization.css';

interface AircraftVisualizationProps {
  aircrafts: Aircraft[];
  conflicts: Conflict[];
}

export const AircraftVisualization: React.FC<AircraftVisualizationProps> = ({
  aircrafts,
  conflicts,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 1;
    const gridSize = 50 * zoom;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw conflict zones
    conflicts.forEach((conflict) => {
      const aircraft1 = aircrafts.find((a) => a.id === conflict.aircraft1);
      const aircraft2 = aircrafts.find((a) => a.id === conflict.aircraft2);

      if (aircraft1 && aircraft2) {
        const x1 = (aircraft1.longitude + 180) * (canvas.width / 360) * zoom;
        const y1 = (90 - aircraft1.latitude) * (canvas.height / 180) * zoom;
        const x2 = (aircraft2.longitude + 180) * (canvas.width / 360) * zoom;
        const y2 = (90 - aircraft2.latitude) * (canvas.height / 180) * zoom;

        // Draw line between conflicting aircraft
        ctx.strokeStyle =
          conflict.severity === 'critical'
            ? '#ff0000'
            : conflict.severity === 'alert'
              ? '#ff6600'
              : '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    });

    // Draw aircraft
    aircrafts.forEach((aircraft) => {
      const x = (aircraft.longitude + 180) * (canvas.width / 360) * zoom;
      const y = (90 - aircraft.latitude) * (canvas.height / 180) * zoom;

      // Draw aircraft symbol
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((aircraft.heading * Math.PI) / 180);

      // Aircraft triangle
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(-5, 8);
      ctx.lineTo(5, 8);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Draw label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(aircraft.callsign, x + 10, y - 10);
      ctx.fillText(`FL${Math.floor(aircraft.altitude / 100)}`, x + 10, y + 5);
    });
  }, [aircrafts, conflicts, zoom]);

  return (
    <div className="visualization-container">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="aircraft-canvas"
      />
      <div className="controls">
        <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>-</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(Math.min(2, zoom + 0.1))}>+</button>
      </div>
    </div>
  );
};
