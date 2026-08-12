import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cylinder, Text, Box } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { hasLineOfSight } from '../utils/lineOfSight';

function lerpAngle(start: number, end: number, t: number) {
  let diff = end - start;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return start + diff * t;
}

export const Enemy = React.memo(({ id, mapConfig }: { id: string; mapConfig?: any }) => {
  const positionRef = useRef<THREE.Group>(null);
  const rotationRef = useRef<THREE.Group>(null);
  const hpBarRef = useRef<THREE.Mesh>(null);
  const hpMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((_, delta) => {
    const worldState = useGameStore.getState().worldState;
    const state = worldState?.enemies[id];
    if (!state || !positionRef.current || !worldState) return;

    // Check Line of Sight visibility relative to active player(s)
    let visibleToAnyPlayer = false;
    const walls = mapConfig?.walls;
    const playersList = Object.values(worldState.players || {}) as any[];

    if (playersList.length === 0) {
      visibleToAnyPlayer = true;
    } else {
      for (let i = 0; i < playersList.length; i++) {
        const p = playersList[i];
        if (p.hp <= 0) continue;

        // Calculate max light / vision range of this player
        const leftLight = p.equippedLeftHand?.lightRadius || 0;
        const rightLight = p.equippedRightHand?.lightRadius || p.equippedWeapon?.lightRadius || 0;
        const maxLightRange = Math.max(8.0, leftLight, rightLight);

        const dx = p.position.x - state.position.x;
        const dz = p.position.z - state.position.z;
        const distSq = dx * dx + dz * dz;

        // If enemy is within player's light radius and has Line of Sight
        if (distSq <= maxLightRange * maxLightRange) {
          if (hasLineOfSight({ x: p.position.x, z: p.position.z }, { x: state.position.x, z: state.position.z }, walls)) {
            visibleToAnyPlayer = true;
            break;
          }
        }
      }
    }

    positionRef.current.visible = visibleToAnyPlayer;
    if (!visibleToAnyPlayer) return;

    const lerpFactor = 1 - Math.exp(-15 * delta);
    const serverPos = new THREE.Vector3(state.position.x, state.position.y, state.position.z);

    if (positionRef.current.position.distanceTo(serverPos) > 3) {
      positionRef.current.position.copy(serverPos);
    } else {
      positionRef.current.position.lerp(serverPos, lerpFactor);
    }
    
    if (rotationRef.current && state.heading !== undefined) {
      rotationRef.current.rotation.y = lerpAngle(rotationRef.current.rotation.y, state.heading, lerpFactor);
    }

    if (hpBarRef.current && hpMatRef.current) {
      const hpPercent = Math.max(0.001, state.hp / state.maxHp);
      hpBarRef.current.scale.x = hpPercent;
      hpBarRef.current.position.x = (hpPercent - 1) / 2;
      hpMatRef.current.color.set(hpPercent > 0.3 ? '#00ff00' : '#ff0000');
    }
  });

  return (
    <group ref={positionRef} position={[0, 0, 0]}>
      {/* 3D HP Bar */}
      <group position={[0, 1.2, 0]}>
        <Box args={[1.0, 0.1, 0.1]} position={[0, 0, 0]}>
          <meshBasicMaterial color="#333333" />
        </Box>
        <Box ref={hpBarRef} args={[1, 0.11, 0.11]} position={[0, 0, 0]}>
          <meshBasicMaterial ref={hpMatRef} color="#00ff00" />
        </Box>
      </group>

      {/* Rotating Body */}
      <group ref={rotationRef}>
        <Cylinder args={[0.5, 0.5, 1, 16]} position={[0, 0.5, 0]}>
          <meshStandardMaterial color="#ff4444" />
        </Cylinder>
        
        <Text
          position={[0, 0.5, 0.51]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {`( > 皿 < )`}
        </Text>
      </group>
    </group>
  );
});
