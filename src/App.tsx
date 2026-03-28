import { useState, useCallback, useEffect } from 'react';
import { ArmCanvas } from './components/ArmCanvas';
import { Controls } from './components/Controls';
import {
  createJoints,
  fabrik,
  ccd,
} from './lib/inverseKinematics';
import type { Joint, Point, ArmConfig } from './lib/inverseKinematics';

const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 600;

const DEFAULT_SEGMENTS = [
  { length: 100, minAngle: -Math.PI, maxAngle: Math.PI },
  { length: 80, minAngle: -Math.PI * 0.8, maxAngle: Math.PI * 0.8 },
  { length: 60, minAngle: -Math.PI * 0.7, maxAngle: Math.PI * 0.7 },
];

function App() {
  const [segmentLengths, setSegmentLengths] = useState<number[]>(
    DEFAULT_SEGMENTS.map((s) => s.length)
  );
  const [joints, setJoints] = useState<Joint[]>([]);
  const [target, setTarget] = useState<Point>({ x: 100, y: 200 });
  const [showConstraints, setShowConstraints] = useState(false);
  const [showAngles, setShowAngles] = useState(true);
  const [ikMethod, setIkMethod] = useState<'fabrik' | 'ccd'>('fabrik');

  // Initialize joints
  const initializeJoints = useCallback(() => {
    const config: ArmConfig = {
      basePosition: { x: 0, y: 0 },
      segments: segmentLengths.map((length, i) => ({
        length,
        minAngle: DEFAULT_SEGMENTS[i]?.minAngle ?? -Math.PI * 0.8,
        maxAngle: DEFAULT_SEGMENTS[i]?.maxAngle ?? Math.PI * 0.8,
      })),
    };
    return createJoints(config);
  }, [segmentLengths]);

  // Initialize on mount and when segments change
  useEffect(() => {
    const newJoints = initializeJoints();
    // Run IK immediately
    const solvedJoints =
      ikMethod === 'fabrik' ? fabrik(newJoints, target) : ccd(newJoints, target);
    setJoints(solvedJoints);
  }, [segmentLengths, initializeJoints]);

  // Update IK when target or method changes
  useEffect(() => {
    if (joints.length === 0) return;

    const solvedJoints =
      ikMethod === 'fabrik' ? fabrik(joints, target) : ccd(joints, target);
    setJoints(solvedJoints);
  }, [target, ikMethod]);

  const handleTargetChange = useCallback(
    (newTarget: Point) => {
      setTarget(newTarget);
    },
    []
  );

  const handleSegmentLengthChange = useCallback((index: number, length: number) => {
    setSegmentLengths((prev) => {
      const next = [...prev];
      next[index] = length;
      return next;
    });
  }, []);

  const handleAddSegment = useCallback(() => {
    if (segmentLengths.length >= 6) return;
    setSegmentLengths((prev) => [...prev, 50]);
  }, [segmentLengths.length]);

  const handleRemoveSegment = useCallback(() => {
    if (segmentLengths.length <= 2) return;
    setSegmentLengths((prev) => prev.slice(0, -1));
  }, [segmentLengths.length]);

  const handleReset = useCallback(() => {
    setSegmentLengths(DEFAULT_SEGMENTS.map((s) => s.length));
    setTarget({ x: 100, y: 200 });
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] p-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex gap-6">
          {/* Controls */}
          <Controls
            joints={joints}
            target={target}
            segmentLengths={segmentLengths}
            onSegmentLengthChange={handleSegmentLengthChange}
            onAddSegment={handleAddSegment}
            onRemoveSegment={handleRemoveSegment}
            showConstraints={showConstraints}
            setShowConstraints={setShowConstraints}
            showAngles={showAngles}
            setShowAngles={setShowAngles}
            ikMethod={ikMethod}
            setIkMethod={setIkMethod}
            onReset={handleReset}
          />

          {/* Canvas */}
          <div className="flex-1">
            <ArmCanvas
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              joints={joints}
              target={target}
              onTargetChange={handleTargetChange}
              showConstraints={showConstraints}
              showAngles={showAngles}
              ikMethod={ikMethod}
            />

            <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-4">
              Drag the red target to move the robotic arm using inverse kinematics
            </p>
          </div>
        </div>
        <footer className="mt-8 py-4 text-center text-xs text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))]">
          Made by{' '}
          <a 
            href="https://github.com/sharziki" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[hsl(var(--primary))] hover:underline"
          >
            Sharvil Saxena
          </a>
        </footer>

      </div>
    </div>
  );
}

export default App;