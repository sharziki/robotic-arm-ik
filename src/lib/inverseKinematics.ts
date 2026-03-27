export interface Point {
  x: number;
  y: number;
}

export interface Joint {
  position: Point;
  angle: number;
  length: number;
  minAngle: number;
  maxAngle: number;
}

export interface ArmConfig {
  basePosition: Point;
  segments: { length: number; minAngle: number; maxAngle: number }[];
}

// Calculate distance between two points
function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Calculate angle from p1 to p2
function angleTo(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

// Clamp angle within min/max bounds
function clampAngle(angle: number, minAngle: number, maxAngle: number): number {
  // Normalize angle to [-PI, PI]
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return Math.max(minAngle, Math.min(maxAngle, angle));
}

// Forward kinematics: compute joint positions from angles
export function forwardKinematics(
  basePosition: Point,
  angles: number[],
  lengths: number[]
): Point[] {
  const positions: Point[] = [basePosition];
  let currentAngle = 0;
  let currentPos = { ...basePosition };

  for (let i = 0; i < angles.length; i++) {
    currentAngle += angles[i];
    const nextPos: Point = {
      x: currentPos.x + lengths[i] * Math.cos(currentAngle),
      y: currentPos.y + lengths[i] * Math.sin(currentAngle),
    };
    positions.push(nextPos);
    currentPos = nextPos;
  }

  return positions;
}

// FABRIK (Forward And Backward Reaching Inverse Kinematics) algorithm
export function fabrik(
  joints: Joint[],
  target: Point,
  tolerance: number = 0.5,
  maxIterations: number = 100
): Joint[] {
  const result = joints.map((j) => ({
    ...j,
    position: { ...j.position },
  }));

  const base = result[0].position;
  const totalLength = result.reduce((sum, j) => sum + j.length, 0);
  const distToTarget = distance(base, target);

  // Check if target is reachable
  if (distToTarget > totalLength) {
    // Target unreachable - stretch arm toward target
    const angle = angleTo(base, target);
    let currentPos = { ...base };

    for (let i = 0; i < result.length; i++) {
      result[i].position = { ...currentPos };
      result[i].angle = i === 0 ? angle : 0;
      currentPos = {
        x: currentPos.x + result[i].length * Math.cos(angle),
        y: currentPos.y + result[i].length * Math.sin(angle),
      };
    }

    return result;
  }

  // FABRIK iterations
  for (let iter = 0; iter < maxIterations; iter++) {
    // Get end effector position
    const endEffector = getEndEffector(result);
    const dist = distance(endEffector, target);

    if (dist < tolerance) break;

    // BACKWARD REACHING: Move end effector to target, propagate backward
    const backwardPositions: Point[] = new Array(result.length + 1);
    backwardPositions[result.length] = { ...target };

    for (let i = result.length - 1; i >= 0; i--) {
      const nextPos = backwardPositions[i + 1];
      const currentPos = result[i].position;
      const len = result[i].length;

      const dir = angleTo(nextPos, currentPos);
      backwardPositions[i] = {
        x: nextPos.x + len * Math.cos(dir),
        y: nextPos.y + len * Math.sin(dir),
      };
    }

    // FORWARD REACHING: Fix base position, propagate forward
    const forwardPositions: Point[] = new Array(result.length + 1);
    forwardPositions[0] = { ...base };

    for (let i = 0; i < result.length; i++) {
      const currentPos = forwardPositions[i];
      const targetPos = backwardPositions[i + 1];
      const len = result[i].length;

      let dir = angleTo(currentPos, targetPos);

      // Apply joint angle constraints
      if (i === 0) {
        dir = clampAngle(dir, result[i].minAngle, result[i].maxAngle);
      } else {
        const prevAngle = angleTo(forwardPositions[i - 1], currentPos);
        const relativeAngle = dir - prevAngle;
        const clampedRelative = clampAngle(
          relativeAngle,
          result[i].minAngle,
          result[i].maxAngle
        );
        dir = prevAngle + clampedRelative;
      }

      forwardPositions[i + 1] = {
        x: currentPos.x + len * Math.cos(dir),
        y: currentPos.y + len * Math.sin(dir),
      };
    }

    // Update joint positions
    for (let i = 0; i < result.length; i++) {
      result[i].position = forwardPositions[i];
    }
  }

  // Calculate final angles
  for (let i = 0; i < result.length; i++) {
    const startPos = result[i].position;
    const endPos =
      i < result.length - 1
        ? result[i + 1].position
        : getEndEffector(result);

    const absoluteAngle = angleTo(startPos, endPos);

    if (i === 0) {
      result[i].angle = absoluteAngle;
    } else {
      const prevAbsoluteAngle = angleTo(
        result[i - 1].position,
        result[i].position
      );
      result[i].angle = absoluteAngle - prevAbsoluteAngle;
    }
  }

  return result;
}

// Get end effector position
function getEndEffector(joints: Joint[]): Point {
  if (joints.length === 0) return { x: 0, y: 0 };

  const lastJoint = joints[joints.length - 1];
  let totalAngle = 0;

  for (let i = 0; i < joints.length; i++) {
    totalAngle += joints[i].angle;
  }

  return {
    x: lastJoint.position.x + lastJoint.length * Math.cos(totalAngle),
    y: lastJoint.position.y + lastJoint.length * Math.sin(totalAngle),
  };
}

// Create initial joints from config
export function createJoints(config: ArmConfig): Joint[] {
  const joints: Joint[] = [];
  let currentPos = { ...config.basePosition };
  let currentAngle = -Math.PI / 2; // Start pointing up

  for (const segment of config.segments) {
    joints.push({
      position: { ...currentPos },
      angle: currentAngle,
      length: segment.length,
      minAngle: segment.minAngle,
      maxAngle: segment.maxAngle,
    });

    currentPos = {
      x: currentPos.x + segment.length * Math.cos(currentAngle),
      y: currentPos.y + segment.length * Math.sin(currentAngle),
    };
    currentAngle = 0; // Subsequent angles are relative
  }

  return joints;
}

// Get all joint positions including end effector
export function getJointPositions(joints: Joint[]): Point[] {
  const positions: Point[] = [];
  let totalAngle = 0;

  for (const joint of joints) {
    positions.push({ ...joint.position });
    totalAngle += joint.angle;
  }

  // Add end effector
  if (joints.length > 0) {
    const lastJoint = joints[joints.length - 1];
    positions.push({
      x: lastJoint.position.x + lastJoint.length * Math.cos(totalAngle),
      y: lastJoint.position.y + lastJoint.length * Math.sin(totalAngle),
    });
  }

  return positions;
}

// CCD (Cyclic Coordinate Descent) algorithm - alternative IK method
export function ccd(
  joints: Joint[],
  target: Point,
  maxIterations: number = 50
): Joint[] {
  const result = joints.map((j) => ({ ...j, position: { ...j.position } }));

  for (let iter = 0; iter < maxIterations; iter++) {
    // Iterate from end to base
    for (let i = result.length - 1; i >= 0; i--) {
      const jointPos = result[i].position;

      // Calculate current end effector position
      let totalAngle = 0;
      for (let k = 0; k <= i; k++) {
        totalAngle += result[k].angle;
      }

      let endEffectorPos = { ...result[i].position };
      let accumulatedAngle = totalAngle;

      for (let k = i; k < result.length; k++) {
        endEffectorPos = {
          x: endEffectorPos.x + result[k].length * Math.cos(accumulatedAngle),
          y: endEffectorPos.y + result[k].length * Math.sin(accumulatedAngle),
        };
        if (k < result.length - 1) {
          accumulatedAngle += result[k + 1].angle;
        }
      }

      // Calculate angles to end effector and target
      const angleToEnd = angleTo(jointPos, endEffectorPos);
      const angleToTarget = angleTo(jointPos, target);
      const deltaAngle = angleToTarget - angleToEnd;

      // Apply delta to this joint
      if (i === 0) {
        result[i].angle = clampAngle(
          result[i].angle + deltaAngle,
          result[i].minAngle,
          result[i].maxAngle
        );
      } else {
        const newAngle = result[i].angle + deltaAngle;
        result[i].angle = clampAngle(
          newAngle,
          result[i].minAngle,
          result[i].maxAngle
        );
      }

      // Update all joint positions after this one
      updateJointPositions(result, i);
    }

    // Check if we've reached the target
    const positions = getJointPositions(result);
    const endEffector = positions[positions.length - 1];
    if (distance(endEffector, target) < 0.5) {
      break;
    }
  }

  return result;
}

// Update joint positions starting from a given index
function updateJointPositions(joints: Joint[], fromIndex: number): void {
  let totalAngle = 0;
  for (let i = 0; i <= fromIndex; i++) {
    totalAngle += joints[i].angle;
  }

  let currentPos =
    fromIndex === 0
      ? joints[0].position
      : {
          x:
            joints[fromIndex].position.x +
            joints[fromIndex].length * Math.cos(totalAngle),
          y:
            joints[fromIndex].position.y +
            joints[fromIndex].length * Math.sin(totalAngle),
        };

  for (let i = fromIndex + 1; i < joints.length; i++) {
    joints[i].position = { ...currentPos };
    totalAngle += joints[i].angle;
    currentPos = {
      x: currentPos.x + joints[i].length * Math.cos(totalAngle),
      y: currentPos.y + joints[i].length * Math.sin(totalAngle),
    };
  }
}
