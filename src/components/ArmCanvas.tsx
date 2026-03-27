import { useRef, useEffect, useCallback } from 'react';
import { getJointPositions } from '../lib/inverseKinematics';
import type { Joint, Point } from '../lib/inverseKinematics';

interface ArmCanvasProps {
  width: number;
  height: number;
  joints: Joint[];
  target: Point;
  onTargetChange: (target: Point) => void;
  showConstraints: boolean;
  showAngles: boolean;
  ikMethod: 'fabrik' | 'ccd';
}

export function ArmCanvas({
  width,
  height,
  joints,
  target,
  onTargetChange,
  showConstraints,
  showAngles,
}: ArmCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);

  const toCanvas = useCallback(
    (point: Point): Point => ({
      x: width / 2 + point.x,
      y: height - 50 - point.y,
    }),
    [width, height]
  );

  const fromCanvas = useCallback(
    (canvasX: number, canvasY: number): Point => ({
      x: canvasX - width / 2,
      y: height - 50 - canvasY,
    }),
    [width, height]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(100, 100, 130, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 40;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw base
    const baseCanvas = toCanvas({ x: 0, y: 0 });
    ctx.fillStyle = '#374151';
    ctx.fillRect(baseCanvas.x - 30, baseCanvas.y, 60, 30);

    // Draw reachability circle
    const totalLength = joints.reduce((sum, j) => sum + j.length, 0);
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(baseCanvas.x, baseCanvas.y, totalLength, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw joint angle constraints
    if (showConstraints && joints.length > 0) {
      const positions = getJointPositions(joints);

      for (let i = 0; i < joints.length; i++) {
        const joint = joints[i];
        const posCanvas = toCanvas(positions[i]);

        // Calculate base angle for this joint
        let baseAngle = 0;
        if (i > 0) {
          const prevPos = positions[i - 1];
          const currPos = positions[i];
          baseAngle = Math.atan2(currPos.y - prevPos.y, currPos.x - prevPos.x);
        }

        // Draw constraint arc
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
        ctx.fillStyle = 'rgba(234, 179, 8, 0.1)';
        ctx.lineWidth = 2;

        const radius = 25;
        const startAngle = -(baseAngle + joint.maxAngle);
        const endAngle = -(baseAngle + joint.minAngle);

        ctx.beginPath();
        ctx.moveTo(posCanvas.x, posCanvas.y);
        ctx.arc(posCanvas.x, posCanvas.y, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Get all joint positions
    const positions = getJointPositions(joints);

    // Draw arm segments
    for (let i = 0; i < positions.length - 1; i++) {
      const start = toCanvas(positions[i]);
      const end = toCanvas(positions[i + 1]);

      // Segment body
      ctx.strokeStyle = `hsl(${220 + i * 30}, 70%, 60%)`;
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // Inner highlight
      ctx.strokeStyle = `hsl(${220 + i * 30}, 70%, 75%)`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    // Draw joints
    for (let i = 0; i < positions.length; i++) {
      const pos = toCanvas(positions[i]);

      // Joint circle
      ctx.fillStyle = i === positions.length - 1 ? '#22c55e' : '#8b5cf6';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, i === positions.length - 1 ? 10 : 8, 0, Math.PI * 2);
      ctx.fill();

      // Joint highlight
      ctx.fillStyle = i === positions.length - 1 ? '#4ade80' : '#a78bfa';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, i === positions.length - 1 ? 5 : 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw angle labels
    if (showAngles && joints.length > 0) {
      ctx.font = '12px monospace';
      ctx.fillStyle = '#9ca3af';

      let totalAngle = 0;
      for (let i = 0; i < joints.length; i++) {
        const joint = joints[i];
        const pos = toCanvas(positions[i]);
        totalAngle += joint.angle;

        const angleDeg = ((joint.angle * 180) / Math.PI).toFixed(1);
        ctx.fillText(`${angleDeg}°`, pos.x + 15, pos.y - 15);
      }
    }

    // Draw target
    const targetCanvas = toCanvas(target);

    // Target glow
    const gradient = ctx.createRadialGradient(
      targetCanvas.x,
      targetCanvas.y,
      0,
      targetCanvas.x,
      targetCanvas.y,
      20
    );
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(targetCanvas.x, targetCanvas.y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Target crosshair
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(targetCanvas.x - 12, targetCanvas.y);
    ctx.lineTo(targetCanvas.x + 12, targetCanvas.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(targetCanvas.x, targetCanvas.y - 12);
    ctx.lineTo(targetCanvas.x, targetCanvas.y + 12);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(targetCanvas.x, targetCanvas.y, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Draw end effector to target line
    if (positions.length > 0) {
      const endEffector = toCanvas(positions[positions.length - 1]);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(endEffector.x, endEffector.y);
      ctx.lineTo(targetCanvas.x, targetCanvas.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Instructions
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px system-ui';
    ctx.fillText('Drag target (crosshair) to move arm', 10, 20);
  }, [width, height, joints, target, toCanvas, showConstraints, showAngles]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const targetCanvas = toCanvas(target);

    const dist = Math.sqrt(
      Math.pow(canvasX - targetCanvas.x, 2) + Math.pow(canvasY - targetCanvas.y, 2)
    );

    if (dist < 25) {
      isDraggingRef.current = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const worldPoint = fromCanvas(canvasX, canvasY);

    onTargetChange(worldPoint);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
}
