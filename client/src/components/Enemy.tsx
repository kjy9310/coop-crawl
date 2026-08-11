import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cylinder, Text, Box } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

function lerpAngle(start: number, end: number, t: number) {
  let diff = end - start;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return start + diff * t;
}

export const Enemy = React.memo(({ id }: { id: string }) => {
  const positionRef = useRef<THREE.Group>(null);
  const rotationRef = useRef<THREE.Group>(null);
  const hpBarRef = useRef<THREE.Mesh>(null);
  const hpMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((_, delta) => {
    const worldState = useGameStore.getState().worldState;
    const state = worldState?.enemies[id];
    if (!state || !positionRef.current || !worldState) return;

    // TODO(Network): To perfectly hide the remaining network jitter, implement a 100ms Interpolation Buffer here later.
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

    // Imperative HP bar update (zero React renders)
    if (hpBarRef.current && hpMatRef.current) {
      const hpPercent = Math.max(0.001, state.hp / state.maxHp);
      hpBarRef.current.scale.x = hpPercent;
      hpBarRef.current.position.x = (hpPercent - 1) / 2;
      hpMatRef.current.color.set(hpPercent > 0.3 ? "#00ff00" : "#ff0000");
    }
  });

  return (
    <group ref={positionRef} position={[0, 0, 0]}>
      
      {/* 3D HP Bar (Does not rotate with enemy) */}
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
        {/* Enemy Body (Cylinder) */}
        <Cylinder args={[0.5, 0.5, 1, 16]} position={[0, 0.5, 0]}>
          <meshStandardMaterial color="#ff4444" />
        </Cylinder>
        
        {/* Cute Angry Face */}
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
