import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

export const Projectile = React.memo(({ id }: { id: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const state = useGameStore.getState().worldState?.projectiles[id];
    if (!state || !meshRef.current) return;

    // Projectiles move very fast, so client-side extrapolation is essential for smoothness
    meshRef.current.position.x += state.velocity.x * delta;
    meshRef.current.position.z += state.velocity.z * delta;

    // Soft-correct to server position
    const serverPos = new THREE.Vector3(state.position.x, state.position.y + 0.5, state.position.z);
    meshRef.current.position.lerp(serverPos, 1 - Math.exp(-15 * delta));
  });

  return (
    <Sphere ref={meshRef} args={[0.25, 8, 8]} position={[0, 0.5, 0]}>
      <meshStandardMaterial color="#00ffaa" emissive="#00ffaa" emissiveIntensity={3} />
    </Sphere>
  );
});
