import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Ring, Cone } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

export const DirectionalBeacon: React.FC<{ myId: string }> = React.memo(({ myId }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const worldState = useGameStore.getState().worldState;
    if (!groupRef.current || !worldState) return;

    const isLocked = worldState.isGoalLocked ?? true;
    const goal = worldState.goalPoint || worldState.exitPoint;
    const player = worldState.players[myId] || Object.values(worldState.players || {})[0];

    if (isLocked || !goal || !player || (goal.x === 0 && goal.z === 0)) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;
    // Position at player's feet
    groupRef.current.position.set(player.position.x, 0.05, player.position.z);

    // Calculate heading angle pointing toward Goal
    const dx = goal.x - player.position.x;
    const dz = goal.z - player.position.z;
    const heading = Math.atan2(dx, dz);

    groupRef.current.rotation.y = heading;
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Outer Golden Beacon Ring */}
      <Ring args={[1.0, 1.15, 32]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#ffcc00" emissive="#ffaa00" emissiveIntensity={5} transparent opacity={0.65} />
      </Ring>
      {/* Directional Arrow Pointing Ahead (+Z direction) */}
      <Cone args={[0.35, 0.8, 16]} position={[0, 0.05, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#ffee00" emissive="#ffdd00" emissiveIntensity={6} transparent opacity={0.85} />
      </Cone>
    </group>
  );
});
