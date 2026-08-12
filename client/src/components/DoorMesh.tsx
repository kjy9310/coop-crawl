import React from 'react';
import { Box, Html, Cylinder } from '@react-three/drei';
import type { Door } from '../store/gameStore';

export const DoorMesh: React.FC<{ door: Door }> = React.memo(({ door }) => {
  if (!door.isLocked) return null;

  const { position, size } = door;
  const numBars = 5;

  const handleDoorClick = (e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const event = new CustomEvent('requestPickup', { detail: {} });
    window.dispatchEvent(event);
  };

  return (
    <group position={[position.x, position.y, position.z]} onClick={handleDoorClick}>
      {/* Outer Door Frame */}
      <Box args={[size.x, size.y, size.z]}>
        <meshStandardMaterial color="#222222" metalness={0.9} roughness={0.3} />
      </Box>

      {/* Iron Bars (Portcullis Grate) */}
      {Array.from({ length: numBars }).map((_, i) => {
        const xOffset = (i - (numBars - 1) / 2) * (size.x / numBars);
        return (
          <Cylinder key={i} args={[0.08, 0.08, size.y, 8]} position={[xOffset, 0, 0]}>
            <meshStandardMaterial color="#444444" metalness={0.95} roughness={0.2} />
          </Cylinder>
        );
      })}

      {/* Red Lock Emblem */}
      <mesh position={[0, 0, size.z / 2 + 0.1]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#ff1100" emissive="#ff3300" emissiveIntensity={4} />
      </mesh>

      {/* Floating Prompt - Clickable HTML Badge */}
      <Html position={[0, size.y / 2 + 0.6, 0]} center style={{ pointerEvents: 'auto', userSelect: 'none' }}>
        <div 
          onClick={handleDoorClick}
          style={{
            background: 'rgba(0,0,0,0.85)',
            border: '1.5px solid #ff4444',
            borderRadius: '6px',
            padding: '6px 12px',
            color: '#ff4444',
            fontSize: '12px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 10px rgba(255, 68, 68, 0.4)',
            cursor: 'pointer'
          }}
        >
          🔒 GOAL ROOM DOOR (Tap to Unlock)
        </div>
      </Html>
    </group>
  );
});
