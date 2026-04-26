import React, { useEffect, useRef, useState } from 'react';
import type { Aircraft, Conflict } from '../../../shared/src/types.js';
import './AircraftVisualization.css';

interface AircraftVisualizationProps {
  aircrafts: Aircraft[];
  conflicts: Conflict[];
  selectedConflict?: string | null;
}

const VELOCITY_LOOK_AHEAD_MIN = 2;

export const AircraftVisualization: React.FC<AircraftVisualizationProps> = ({
  aircrafts,
  conflicts,
  selectedConflict,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#0a0f1e';
    ctx.fillRect(0, 0, W, H);

    if (aircrafts.length === 0) {
      ctx.fillStyle = '#334';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No aircraft loaded — select a scenario or click Run', W / 2, H / 2);
      ctx.textAlign = 'left';
      return;
    }

    // ── Bounding box ──────────────────────────────────────────────────────────
    const lats = aircrafts.map((a) => a.latitude);
    const lons = aircrafts.map((a) => a.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const latRange = Math.max(maxLat - minLat, 0.5);
    const lonRange = Math.max(maxLon - minLon, 0.5);
    const pad = 0.22;
    const viewMinLat = minLat - latRange * pad;
    const viewMaxLat = maxLat + latRange * pad;
    const viewMinLon = minLon - lonRange * pad;
    const viewMaxLon = maxLon + lonRange * pad;

    const centerLat = (viewMinLat + viewMaxLat) / 2;
    const centerLon = (viewMinLon + viewMaxLon) / 2;
    const cosCenter = Math.cos((centerLat * Math.PI) / 180);

    const pixelsPerNM   = (H * zoom) / ((viewMaxLat - viewMinLat) * 60);
    const viewWidthNM   = (viewMaxLon - viewMinLon) * cosCenter * 60;
    const viewHeightNM  = (viewMaxLat - viewMinLat) * 60;
    const viewDiagNM    = Math.sqrt(viewWidthNM ** 2 + viewHeightNM ** 2);

    // ── Coordinate helpers ────────────────────────────────────────────────────
    const toX = (lon: number) =>
      ((lon - viewMinLon) / (viewMaxLon - viewMinLon)) * W * zoom;
    const toY = (lat: number) =>
      ((viewMaxLat - lat) / (viewMaxLat - viewMinLat)) * H * zoom;

    const centerX = toX(centerLon);
    const centerY = toY(centerLat);

    // ── Background grid ───────────────────────────────────────────────────────
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1;
    const gridStep = 50 * zoom;
    for (let x = 0; x < W; x += gridStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gridStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // ── Range rings ───────────────────────────────────────────────────────────
    const ringInterval =
      viewDiagNM < 40  ?  5 :
      viewDiagNM < 120 ? 10 :
      viewDiagNM < 300 ? 25 : 50;

    const maxRings = Math.ceil((viewDiagNM / 2) / ringInterval) + 1;

    ctx.strokeStyle = 'rgba(0, 180, 220, 0.18)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.fillStyle = 'rgba(0, 180, 220, 0.55)';
    ctx.font = '10px monospace';

    for (let r = 1; r <= maxRings; r++) {
      const ringNM  = r * ringInterval;
      const ringPxY = ringNM * pixelsPerNM;
      const ringPxX = ringNM * (W * zoom) / ((viewMaxLon - viewMinLon) * cosCenter * 60);
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, ringPxX, ringPxY, 0, 0, 2 * Math.PI);
      ctx.stroke();
      const labelY = centerY - ringPxY - 3;
      if (labelY > 8) ctx.fillText(`${ringNM} nm`, centerX + 4, labelY);
    }
    ctx.setLineDash([]);

    // ── Conflict lines ────────────────────────────────────────────────────────
    conflicts.forEach((conflict) => {
      const a1 = aircrafts.find((a) => a.id === conflict.aircraft1);
      const a2 = aircrafts.find((a) => a.id === conflict.aircraft2);
      if (!a1 || !a2) return;

      const x1 = toX(a1.longitude);
      const y1 = toY(a1.latitude);
      const x2 = toX(a2.longitude);
      const y2 = toY(a2.latitude);

      const isSelected = conflict.id === selectedConflict;
      const baseColor =
        conflict.severity === 'critical' ? '#ff3333' :
        conflict.severity === 'alert'    ? '#ff8800' : '#ffdd00';

      ctx.strokeStyle = isSelected ? '#ffffff' : baseColor;
      ctx.lineWidth   = isSelected ? 3 : 1.5;
      ctx.setLineDash(isSelected ? [8, 4] : [5, 5]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current-separation label at midpoint
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const sepLabel = `${conflict.distance.toFixed(1)} nm`;
      ctx.font = 'bold 11px monospace';
      const tw = ctx.measureText(sepLabel).width;
      ctx.fillStyle = '#000';
      ctx.fillRect(mx - tw / 2 - 2, my - 9, tw + 4, 13);
      ctx.fillStyle = isSelected ? '#ffffff' : baseColor;
      ctx.textAlign = 'center';
      ctx.fillText(sepLabel, mx, my);
      ctx.textAlign = 'left';
    });

    // ── Collision arrows + impact markers ─────────────────────────────────────
    // Drawn before aircraft symbols so the planes render on top.
    drawCollisionMarkers(ctx, conflicts, aircrafts, toX, toY);

    // ── Velocity vectors (2-min look-ahead) ───────────────────────────────────
    aircrafts.forEach((aircraft) => {
      const x = toX(aircraft.longitude);
      const y = toY(aircraft.latitude);
      const headingRad = (aircraft.heading * Math.PI) / 180;
      const nmAhead    = (aircraft.speed / 60) * VELOCITY_LOOK_AHEAD_MIN;
      const cosLat     = Math.max(Math.cos((aircraft.latitude * Math.PI) / 180), 1e-10);
      const vecLat     = aircraft.latitude  + (nmAhead * Math.cos(headingRad)) / 60;
      const vecLon     = aircraft.longitude + (nmAhead * Math.sin(headingRad)) / (60 * cosLat);
      ctx.strokeStyle = 'rgba(0, 255, 100, 0.40)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(toX(vecLon), toY(vecLat));
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // ── Aircraft symbols ──────────────────────────────────────────────────────
    aircrafts.forEach((aircraft) => {
      const x = toX(aircraft.longitude);
      const y = toY(aircraft.latitude);
      const inConflict = conflicts.some(
        (c) => c.aircraft1 === aircraft.id || c.aircraft2 === aircraft.id,
      );
      const fillColor = inConflict ? '#ffdd00' : '#00ff66';

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((aircraft.heading * Math.PI) / 180);
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(-6, 9);
      ctx.lineTo(0, 5);
      ctx.lineTo(6, 9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = fillColor;
      ctx.fillText(aircraft.callsign, x + 13, y - 6);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#99bbcc';
      ctx.fillText(`FL${Math.floor(aircraft.altitude / 100)}`, x + 13, y + 7);
    });

    // ── Overlays ──────────────────────────────────────────────────────────────
    drawNorthIndicator(ctx, W - 36, 36, 22);
    drawScaleBar(ctx, pixelsPerNM, ringInterval, 12, H - 18);

  }, [aircrafts, conflicts, zoom, selectedConflict]);

  return (
    <div className="visualization-container">
      <canvas ref={canvasRef} width={800} height={600} className="aircraft-canvas" />
      <div className="controls">
        <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(1)))}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(1)))}>+</button>
      </div>
    </div>
  );
};

// ── Collision markers ─────────────────────────────────────────────────────────

function projectToTCA(
  ac: Aircraft,
  minutes: number,
): { lat: number; lon: number } {
  const headingRad = (ac.heading * Math.PI) / 180;
  const nmAhead    = (ac.speed / 60) * minutes;
  const cosLat     = Math.max(Math.cos((ac.latitude * Math.PI) / 180), 1e-10);
  return {
    lat: ac.latitude  + (nmAhead * Math.cos(headingRad)) / 60,
    lon: ac.longitude + (nmAhead * Math.sin(headingRad)) / (60 * cosLat),
  };
}

function formatCountdown(minutes: number): string {
  const totalSecs = Math.max(0, minutes * 60);
  const m = Math.floor(totalSecs / 60);
  const s = Math.floor(totalSecs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function drawCollisionArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
) {
  const dx   = toX - fromX;
  const dy   = toY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 20) return; // too close — nothing meaningful to draw

  const angle = Math.atan2(dy, dx);
  // Start 16px past the aircraft symbol, end 18px before the impact marker
  const startX = fromX + Math.cos(angle) * 16;
  const startY = fromY + Math.sin(angle) * 16;
  const endX   = toX   - Math.cos(angle) * 18;
  const endY   = toY   - Math.sin(angle) * 18;

  // Shaft
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Arrowhead (filled triangle)
  const headSize = 10;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(endX + Math.cos(angle) * headSize, endY + Math.sin(angle) * headSize);
  ctx.lineTo(
    endX + Math.cos(angle + 2.4) * headSize,
    endY + Math.sin(angle + 2.4) * headSize,
  );
  ctx.lineTo(
    endX + Math.cos(angle - 2.4) * headSize,
    endY + Math.sin(angle - 2.4) * headSize,
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawImpactMarker(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  countdown: string,
  color: string,
  isCritical: boolean,
) {
  ctx.save();

  // Outer glow ring
  ctx.strokeStyle = color;
  ctx.lineWidth   = isCritical ? 2.5 : 1.5;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Inner filled circle
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(cx, cy, 11, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;

  // ✕ symbol
  ctx.strokeStyle = '#000';
  ctx.lineWidth   = 2.2;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx + 5, cy + 5);
  ctx.moveTo(cx + 5, cy - 5); ctx.lineTo(cx - 5, cy + 5);
  ctx.stroke();

  // Countdown pill below the marker
  const label    = `IMPACT ${countdown}`;
  ctx.font       = `bold ${isCritical ? 12 : 11}px monospace`;
  const tw       = ctx.measureText(label).width;
  const pillX    = cx - tw / 2 - 4;
  const pillY    = cy + 15;
  const pillW    = tw + 8;
  const pillH    = 16;

  // Pill background
  ctx.fillStyle   = '#000';
  ctx.globalAlpha = 0.75;
  roundRect(ctx, pillX, pillY, pillW, pillH, 3);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Pill border
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.5;
  roundRect(ctx, pillX, pillY, pillW, pillH, 3);
  ctx.stroke();

  // Pill text
  ctx.fillStyle  = color;
  ctx.textAlign  = 'center';
  ctx.fillText(label, cx, pillY + 11);
  ctx.textAlign  = 'left';

  ctx.restore();
}

function drawCollisionMarkers(
  ctx: CanvasRenderingContext2D,
  conflicts: Conflict[],
  aircrafts: Aircraft[],
  toX: (lon: number) => number,
  toY: (lat: number) => number,
) {
  conflicts.forEach((conflict) => {
    const tca = conflict.timeToClosestPoint;
    if (tca <= 0) return; // already past closest approach

    const a1 = aircrafts.find((a) => a.id === conflict.aircraft1);
    const a2 = aircrafts.find((a) => a.id === conflict.aircraft2);
    if (!a1 || !a2) return;

    // Project each aircraft to TCA, average to get impact point
    const p1 = projectToTCA(a1, tca);
    const p2 = projectToTCA(a2, tca);
    const impactLat = (p1.lat + p2.lat) / 2;
    const impactLon = (p1.lon + p2.lon) / 2;

    const ix = toX(impactLon);
    const iy = toY(impactLat);

    const color = conflict.severity === 'critical' ? '#ff2222' :
                  conflict.severity === 'alert'    ? '#ff8800' : '#ffdd00';

    const isCritical = conflict.severity === 'critical';

    // Arrows from each aircraft toward impact point
    drawCollisionArrow(ctx, toX(a1.longitude), toY(a1.latitude), ix, iy, color);
    drawCollisionArrow(ctx, toX(a2.longitude), toY(a2.latitude), ix, iy, color);

    // Impact marker with countdown
    drawImpactMarker(ctx, ix, iy, formatCountdown(tca), color, isCritical);
  });
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x,     y + r);
  ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}

function drawNorthIndicator(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 15, 30, 0.75)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 180, 220, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#00d4ff';
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius + 4);
  ctx.lineTo(cx - 5, cy + 4);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#334455';
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius + 4);
  ctx.lineTo(cx + 5, cy + 4);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();

  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#00d4ff';
  ctx.textAlign = 'center';
  ctx.fillText('N', cx, cy - radius + 13);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawScaleBar(
  ctx: CanvasRenderingContext2D,
  pixelsPerNM: number,
  intervalNM: number,
  x: number, y: number,
) {
  const barPx = pixelsPerNM * intervalNM;
  if (!Number.isFinite(barPx) || barPx < 4) return;

  ctx.save();
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + barPx, y);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 4);       ctx.lineTo(x, y + 4);
  ctx.moveTo(x + barPx, y-4); ctx.lineTo(x + barPx, y + 4);
  ctx.stroke();
  ctx.font = '10px monospace';
  ctx.fillStyle = '#00d4ff';
  ctx.textAlign = 'center';
  ctx.fillText(`${intervalNM} nm`, x + barPx / 2, y - 6);
  ctx.textAlign = 'left';
  ctx.restore();
}
