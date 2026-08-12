import React from 'react';
import { Instances, Instance, Html } from '@react-three/drei';
import { useGameStore } from '../../store/gameStore';
import { Player } from '../Player';
import { Enemy } from '../Enemy';
import { GroundItem } from '../GroundItem';
import { Projectile } from '../Projectile';
import { DirectionalBeacon } from './DirectionalBeacon';
import { DoorMesh } from '../DoorMesh';

export const MapWalls = React.memo(({ walls }: { walls: any[] }) => {
  if (!walls || walls.length === 0) return null;
  return (
    <Instances limit={2000}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#555555" />
      {walls.map((w: any) => (
        <Instance 
          key={w.id} 
          position={[w.position.x, w.position.y, w.position.z]} 
          scale={[w.size.x, w.size.y, w.size.z]} 
        />
      ))}
    </Instances>
  );
});

export const GoalZone = React.memo(({ position, isLocked }: { position?: { x: number; y: number; z: number }; isLocked?: boolean }) => {
  if (!position || (position.x === 0 && position.z === 0)) return null;

  const color = isLocked ? '#ff2222' : '#ffcc00';
  const emissive = isLocked ? '#ff0000' : '#ffaa00';

  return (
    <group position={[position.x, 0.05, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 1.8, 32]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={6} transparent opacity={0.85} />
      </mesh>

      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.3, 0.8, 3, 16]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={4} transparent opacity={0.35} />
      </mesh>

      <Html position={[0, 3.5, 0]} center style={{ pointerEvents: 'none', color: isLocked ? '#ff5555' : '#ffe600', fontWeight: 'bold', fontSize: '14px', textShadow: '0 0 8px #000', userSelect: 'none', whiteSpace: 'nowrap' }}>
        {isLocked ? '🔒 LOCKED EXIT (Find Key)' : '🚩 EXIT GOAL 🚩'}
      </Html>
    </group>
  );
});

interface GameSceneProps {
  myId: string;
  mapConfig: any;
  handlePointerDown: (e: any) => void;
  pointerPosRef: React.MutableRefObject<{ x: number; z: number }>;
}

export const GameScene = React.memo(({ myId, mapConfig, handlePointerDown, pointerPosRef }: GameSceneProps) => {
  const worldState = useGameStore(s => s.worldState);

  const playerIds = Object.keys(worldState?.players || {});
  const cameraTargetId = myId && playerIds.includes(myId) ? myId : playerIds[0];

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[10, 20, 10]} intensity={0.2} />
      
      {/* Render Directional Beacon Guidance */}
      <DirectionalBeacon myId={myId || cameraTargetId} />

      {/* Render Players */}
      {worldState?.players && playerIds.map(id => (
        <Player key={id} id={id} isLocal={id === cameraTargetId} />
      ))}
      
      {/* Render Enemies */}
      {worldState?.enemies && Object.keys(worldState.enemies).map(id => (
        <Enemy key={id} id={id} mapConfig={mapConfig} />
      ))}
      
      {/* Render Ground Items */}
      {worldState?.items && Object.values(worldState.items).map(item => (
        <GroundItem key={item.id} id={item.id} item={item} myId={myId} mapConfig={mapConfig} />
      ))}

      {/* Render Projectiles */}
      {worldState?.projectiles && Object.keys(worldState.projectiles).map(id => (
        <Projectile key={id} id={id} />
      ))}
      
      {/* Render Spawners */}
      {worldState?.spawners && Object.values(worldState.spawners).map(s => (
        <mesh key={s.id} position={[s.position.x, 0.01, s.position.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1, 32]} />
          <meshStandardMaterial color="#550000" opacity={0.5} transparent />
        </mesh>
      ))}
      
      {/* Render Goal Room Locked Doors */}
      {worldState?.doors && Object.values(worldState.doors).map(door => (
        <DoorMesh key={door.id} door={door} />
      ))}

      {/* Render Goal Zone */}
      {worldState?.goalPoint && <GoalZone position={worldState.goalPoint} isLocked={worldState.isGoalLocked ?? true} />}
      
      {/* Render Walls using InstancedMesh with React.memo for performance */}
      {mapConfig?.walls && <MapWalls walls={mapConfig.walls} />}
      
      {/* Ground */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[50, 0, 50]} 
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          pointerPosRef.current = { x: e.point.x, z: e.point.z };
        }}
      >
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </>
  );
});
