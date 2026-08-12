import React from 'react';
import { Cylinder, Torus, Sphere } from '@react-three/drei';

export const KeyMesh: React.FC = React.memo(() => {
  return (
    <group position={[0, 0.4, 0]} rotation={[Math.PI / 4, 0, 0]}>
      {/* Key Ring Handle */}
      <Torus args={[0.15, 0.04, 12, 24]} position={[0, 0.25, 0]}>
        <meshStandardMaterial color="#ffcc00" emissive="#ffaa00" emissiveIntensity={3} metalness={0.9} roughness={0.2} />
      </Torus>
      {/* Key Shaft */}
      <Cylinder args={[0.03, 0.03, 0.5, 8]} position={[0, -0.05, 0]}>
        <meshStandardMaterial color="#ffcc00" emissive="#ffaa00" emissiveIntensity={2} metalness={0.9} roughness={0.2} />
      </Cylinder>
      {/* Key Teeth */}
      <Cylinder args={[0.03, 0.03, 0.12, 8]} position={[0.06, -0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#ffcc00" emissive="#ffaa00" emissiveIntensity={3} metalness={0.9} roughness={0.2} />
      </Cylinder>
      {/* Key Aura Glow */}
      <Sphere args={[0.3, 16, 16]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#ffea00" emissive="#ffee00" emissiveIntensity={2} transparent opacity={0.35} />
      </Sphere>
    </group>
  );
});
