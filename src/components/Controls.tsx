import { Settings, Eye, EyeOff, RotateCcw, Plus, Minus } from 'lucide-react';
import type { Joint, Point } from '../lib/inverseKinematics';

interface ControlsProps {
  joints: Joint[];
  target: Point;
  segmentLengths: number[];
  onSegmentLengthChange: (index: number, length: number) => void;
  onAddSegment: () => void;
  onRemoveSegment: () => void;
  showConstraints: boolean;
  setShowConstraints: (show: boolean) => void;
  showAngles: boolean;
  setShowAngles: (show: boolean) => void;
  ikMethod: 'fabrik' | 'ccd';
  setIkMethod: (method: 'fabrik' | 'ccd') => void;
  onReset: () => void;
}

export function Controls({
  joints,
  target,
  segmentLengths,
  onSegmentLengthChange,
  onAddSegment,
  onRemoveSegment,
  showConstraints,
  setShowConstraints,
  showAngles,
  setShowAngles,
  ikMethod,
  setIkMethod,
  onReset,
}: ControlsProps) {
  // Calculate end effector distance from target
  const endEffectorDist = joints.length > 0 ? (() => {
    let totalAngle = 0;
    let pos = joints[0].position;

    for (const joint of joints) {
      totalAngle += joint.angle;
      pos = {
        x: joint.position.x + joint.length * Math.cos(totalAngle),
        y: joint.position.y + joint.length * Math.sin(totalAngle),
      };
    }

    return Math.sqrt(
      Math.pow(pos.x - target.x, 2) + Math.pow(pos.y - target.y, 2)
    );
  })() : 0;

  const totalReach = segmentLengths.reduce((sum, l) => sum + l, 0);

  return (
    <div className="w-72 space-y-4">
      {/* Title */}
      <div className="p-4 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))]">
        <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">
          Robotic Arm IK
        </h1>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
          Inverse Kinematics Visualization
        </p>
      </div>

      {/* IK Algorithm */}
      <div className="p-4 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] space-y-3">
        <h2 className="text-sm font-medium text-[hsl(var(--foreground))] flex items-center gap-2">
          <Settings className="w-4 h-4" />
          IK Algorithm
        </h2>

        <div className="flex gap-2">
          <button
            onClick={() => setIkMethod('fabrik')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              ikMethod === 'fabrik'
                ? 'bg-[hsl(var(--primary))] text-white'
                : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'
            }`}
          >
            FABRIK
          </button>
          <button
            onClick={() => setIkMethod('ccd')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              ikMethod === 'ccd'
                ? 'bg-[hsl(var(--primary))] text-white'
                : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'
            }`}
          >
            CCD
          </button>
        </div>

        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {ikMethod === 'fabrik'
            ? 'Forward And Backward Reaching IK - Fast convergence'
            : 'Cyclic Coordinate Descent - Iterative joint adjustment'}
        </p>
      </div>

      {/* Arm Segments */}
      <div className="p-4 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[hsl(var(--foreground))]">
            Arm Segments ({segmentLengths.length})
          </h2>
          <div className="flex gap-1">
            <button
              onClick={onRemoveSegment}
              disabled={segmentLengths.length <= 2}
              className="p-1.5 rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={onAddSegment}
              disabled={segmentLengths.length >= 6}
              className="p-1.5 rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {segmentLengths.map((length, i) => (
          <div key={i}>
            <label className="text-xs text-[hsl(var(--muted-foreground))]">
              Segment {i + 1}: {length}px
            </label>
            <input
              type="range"
              min={30}
              max={150}
              value={length}
              onChange={(e) => onSegmentLengthChange(i, parseInt(e.target.value))}
              className="w-full h-2 bg-[hsl(var(--secondary))] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[hsl(var(--primary))]"
            />
          </div>
        ))}

        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Total reach: {totalReach}px
        </p>
      </div>

      {/* Visibility */}
      <div className="p-4 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] space-y-2">
        <h2 className="text-sm font-medium text-[hsl(var(--foreground))]">Display Options</h2>

        <button
          onClick={() => setShowConstraints(!showConstraints)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            showConstraints
              ? 'bg-[#eab308]/20 text-[#eab308]'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'
          }`}
        >
          {showConstraints ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          Joint Constraints
        </button>

        <button
          onClick={() => setShowAngles(!showAngles)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            showAngles
              ? 'bg-[#3b82f6]/20 text-[#3b82f6]'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'
          }`}
        >
          {showAngles ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          Joint Angles
        </button>
      </div>

      {/* Stats */}
      <div className="p-4 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))]">
        <h2 className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">Status</h2>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground)))]">Target:</span>
            <span className="text-[hsl(var(--foreground))] font-mono">
              ({target.x.toFixed(0)}, {target.y.toFixed(0)})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Error:</span>
            <span className={`font-mono ${endEffectorDist < 1 ? 'text-green-500' : 'text-[hsl(var(--foreground))]'}`}>
              {endEffectorDist.toFixed(2)}px
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Reachable:</span>
            <span className={`font-mono ${
              Math.sqrt(target.x * target.x + target.y * target.y) <= totalReach
                ? 'text-green-500'
                : 'text-red-500'
            }`}>
              {Math.sqrt(target.x * target.x + target.y * target.y) <= totalReach ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] rounded-lg text-sm font-medium hover:bg-[hsl(var(--muted))] transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        Reset
      </button>

      {/* Info */}
      <div className="p-4 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))]">
        <h2 className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">How It Works</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
          <strong>Inverse Kinematics</strong> calculates joint angles needed to reach a target position.
          FABRIK uses forward/backward reaching passes while CCD iteratively adjusts each joint.
        </p>
      </div>
    </div>
  );
}
