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

    // 100% Core-Authoritative position rendering
    const serverPos = new THREE.Vector3(state.position.x, state.position.y + 0.5, state.position.z);
    meshRef.current.position.lerp(serverPos, 1 - Math.exp(-25 * delta));
  });

  const projState = useGameStore(s => s.worldState?.projectiles[id]);
  const projType = projState?.type || 'magic';

  const colorMap: Record<string, string> = {
    heal: '#00ff88',
    arrow: '#ffcc00',
    magic: '#00ccff',
  };

  const glowColor = colorMap[projType] || '#00ccff';

  return (
    <Sphere ref={meshRef} args={[0.25, 8, 8]} position={[0, 0.5, 0]}>
      <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={3.5} />
    </Sphere>
  );
});
