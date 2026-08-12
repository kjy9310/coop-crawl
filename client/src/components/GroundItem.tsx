import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import type { Item } from '../store/gameStore';
import { LightMesh } from './LightMesh';
import { KeyMesh } from './KeyMesh';
import { hasLineOfSight } from '../utils/lineOfSight';

export const GroundItem = React.memo(({ id, item, mapConfig }: { id: string; item: Item; myId: string; mapConfig?: any }) => {
  const meshRef = useRef<THREE.Group>(null);
  const containerRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = 0.4 + Math.sin(Date.now() / 300) * 0.08;
      meshRef.current.rotation.y += delta * 0.8;
    }

    // Line of Sight check
    const worldState = useGameStore.getState().worldState;
    if (containerRef.current && worldState) {
      let visibleToAnyPlayer = false;
      const walls = mapConfig?.walls;
      const playersList = Object.values(worldState.players || {}) as any[];

      if (playersList.length === 0) {
        visibleToAnyPlayer = true;
      } else {
        for (let i = 0; i < playersList.length; i++) {
          const p = playersList[i];
          if (p.hp <= 0) continue;

          const leftLight = p.equippedLeftHand?.lightRadius || 0;
          const rightLight = p.equippedRightHand?.lightRadius || p.equippedWeapon?.lightRadius || 0;
          const maxLightRange = Math.max(8.0, leftLight, rightLight);

          const dx = p.position.x - item.position.x;
          const dz = p.position.z - item.position.z;
          const distSq = dx * dx + dz * dz;

          if (distSq <= maxLightRange * maxLightRange) {
            if (hasLineOfSight({ x: p.position.x, z: p.position.z }, { x: item.position.x, z: item.position.z }, walls)) {
              visibleToAnyPlayer = true;
              break;
            }
          }
        }
      }

      containerRef.current.visible = visibleToAnyPlayer;
    }
  });

  const handlePickup = () => {
    const event = new CustomEvent('requestPickup', { detail: { itemId: id } });
    window.dispatchEvent(event);
  };

  const isLightSource = item.type === 'torch' || item.type === 'lantern' || (item.lightRadius && item.lightRadius > 0);

  return (
    <group ref={containerRef} position={[item.position.x, item.position.y, item.position.z]}>
      <group 
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          handlePickup();
        }}
      >
        {item.type === 'key' ? (
          <KeyMesh />
        ) : isLightSource ? (
          <LightMesh type={item.type} color={item.lightColor || '#ff9933'} />
        ) : (
          <Box args={[0.4, 0.4, 0.4]}>
            <meshStandardMaterial color="#00ff00" emissive="#003300" />
          </Box>
        )}
      </group>

      {/* Dynamic Point Light on Floor when Light Source is lying on ground */}
      {isLightSource && (
        <pointLight 
          color={item.lightColor || '#ff9933'} 
          intensity={item.lightIntensity || 3.0} 
          distance={item.lightRadius || 14.0} 
          position={[0, 0.5, 0]} 
        />
      )}

      {hovered && (
        <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(0,0,0,0.85)', 
            color: 'white', 
            padding: '6px 10px', 
            borderRadius: '6px',
            border: '1px solid #00ffcc',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>{item.name}</span> <br/>
            {isLightSource ? (
              <span style={{ color: '#ffcc00' }}>Light Radius: {item.lightRadius}m ({item.handType || 'left'})</span>
            ) : (
              <span>Dmg: {item.damage} | Range: {item.range || item.length} ({item.handType || 'right'})</span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
});
