import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import type { Item } from '../store/gameStore';

export const GroundItem = React.memo(({ id, item, myId }: { id: string, item: Item, myId: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (meshRef.current) {
      // Bobbing animation
      meshRef.current.position.y = 0.5 + Math.sin(Date.now() / 300) * 0.1;
      meshRef.current.rotation.y += delta;
    }
  });

  const handlePickup = () => {
    // We don't send the event directly here, we let App.tsx handle it or we can trigger it through PeerManager.
    // However, App.tsx has the peerManager ref.
    // For simplicity, we can dispatch a custom DOM event that App.tsx listens to, OR just expose a function in the store.
    // Let's use a custom event since PeerManager is in App.tsx.
    const event = new CustomEvent('requestPickup', { detail: { itemId: id } });
    window.dispatchEvent(event);
  };

  return (
    <group position={[item.position.x, item.position.y, item.position.z]}>
      <Box 
        ref={meshRef} 
        args={[0.4, 0.4, 0.4]} 
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          handlePickup();
        }}
      >
        <meshStandardMaterial color="#00ff00" emissive="#003300" />
      </Box>

      {hovered && (
        <Html position={[0, 1, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(0,0,0,0.8)', 
            color: 'white', 
            padding: '4px 8px', 
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}>
            {item.name} <br/>
            Dmg: {item.damage} | Range: {item.range}
          </div>
        </Html>
      )}
    </group>
  );
});
