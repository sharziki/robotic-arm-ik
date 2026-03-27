# Robotic Arm IK

Interactive visualization of inverse kinematics for a multi-joint robotic arm. Drag the target and watch the arm calculate joint angles in real-time using FABRIK or CCD algorithms.

## Features

- **FABRIK Algorithm**: Forward And Backward Reaching Inverse Kinematics
- **CCD Algorithm**: Cyclic Coordinate Descent as alternative solver
- **Interactive Target**: Drag to move, arm follows in real-time
- **Configurable Arm**: Add/remove segments, adjust lengths
- **Joint Constraints**: Visualize angle limits
- **Angle Display**: See computed joint angles

## How It Works

### Inverse Kinematics Problem
Given a target position, find joint angles that place the end effector at that position. This is the inverse of forward kinematics (angles → position).

### FABRIK Algorithm
1. **Backward Reaching**: Move end effector to target, propagate positions backward to base
2. **Forward Reaching**: Fix base position, propagate positions forward to end effector
3. **Iterate** until end effector reaches target

### CCD Algorithm
1. For each joint (from end to base):
   - Calculate angle to target from current joint
   - Rotate joint to minimize distance to target
2. **Iterate** until convergence

## Controls

| Control | Description |
|---------|-------------|
| Target Drag | Move the red crosshair to set target |
| Algorithm Toggle | Switch between FABRIK and CCD |
| Segment Sliders | Adjust individual segment lengths |
| +/- Buttons | Add or remove arm segments |
| Display Options | Toggle joint constraints and angles |

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS 4
- Canvas API for rendering

## Getting Started

```bash
npm install
npm run dev
```

## Algorithm Details

### Forward Kinematics
```
position[i+1] = position[i] + length[i] * (cos(θ), sin(θ))
where θ = sum of all previous joint angles
```

### FABRIK Backward Pass
```
direction = normalize(position[i] - position[i+1])
position[i] = position[i+1] + direction * length[i]
```

### FABRIK Forward Pass
```
direction = normalize(position[i+1] - position[i])
position[i+1] = position[i] + direction * length[i]
```

### CCD Joint Update
```
θ_to_end = atan2(end.y - joint.y, end.x - joint.x)
θ_to_target = atan2(target.y - joint.y, target.x - joint.x)
Δθ = θ_to_target - θ_to_end
joint.angle += Δθ
```

## License

MIT
