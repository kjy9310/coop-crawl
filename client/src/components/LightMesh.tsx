import React from 'react';
import { Cylinder, Sphere } from '@react-three/drei';

interface LightMeshProps {
  type: string; // "torch" | "lantern"
  color?: string;
  intensity?: number;
}

export const LightMesh: React.FC<LightMeshProps> = React.memo(({ type, color = '#ff9933' }) => {
  if (type === 'lantern') {
    return (
      <group position={[0, 0.4, 0]}>
        {/* Lantern Body */}
        <Cylinder args={[0.12, 0.15, 0.35, 8]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#332211" metalness={0.8} roughness={0.3} />
        </Cylinder>
        {/* Glow Core */}
        <Sphere args={[0.08, 8, 8]} position={[0, 0, 0]}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={5} />
        </Sphere>
      </group>
    );
  }

  // Default Torch Mesh
  return (
    <group position={[0, 0.4, 0]}>
      {/* Wooden Handle */}
      <Cylinder args={[0.04, 0.04, 0.6, 8]} position={[0, -0.1, 0]}>
        <meshStandardMaterial color="#553311" roughness={0.8} />
      </Cylinder>
      {/* Flame Head */}
      <Sphere args={[0.1, 8, 8]} position={[0, 0.2, 0]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={6} />
      </Sphere>
    </group>
  );
});
