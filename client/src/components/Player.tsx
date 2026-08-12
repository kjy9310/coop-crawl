import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Html, Ring } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { LightMesh } from './LightMesh';

function lerpAngle(start: number, end: number, t: number) {
  let diff = end - start;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return start + diff * t;
}

const HealingAura = React.memo(({ id }: { id: string }) => {
  const domeRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const worldState = useGameStore.getState().worldState;
    const player = worldState?.players[id];
    if (!domeRef.current || !ringRef.current) return;

    // 1. Skill Caster Dome Aura (3.5m radius expanding sanctuary dome)
    const isCasting = !!(worldState && player?.lastSkillCastTick && (worldState.tick - player.lastSkillCastTick < 25));
    domeRef.current.visible = isCasting;
    if (isCasting) {
      const elapsed = worldState.tick - player.lastSkillCastTick!;
      const progress = elapsed / 25.0;
      const scale = 0.5 + progress * 3.0;
      domeRef.current.scale.set(scale, scale, 1.2);
      domeRef.current.position.y = 0.1 + progress * 0.5;
    }

    // 2. Heal Receiver Personal Ring (Compact 1.0m ring tight around body)
    const isReceivingHeal = !!(worldState && player?.lastHealTick && (worldState.tick - player.lastHealTick < 25) && !isCasting);
    ringRef.current.visible = isReceivingHeal;
    if (isReceivingHeal) {
      const elapsed = worldState.tick - player.lastHealTick!;
      const progress = elapsed / 25.0;
      const scale = 0.8 + progress * 0.3;
      ringRef.current.scale.set(scale, scale, 1.0);
      ringRef.current.position.y = 0.1 + progress * 1.2;
    }
  });

  return (
    <>
      <Ring ref={domeRef} args={[0.3, 1.2, 32]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <meshStandardMaterial color="#00ff66" emissive="#00ff88" emissiveIntensity={6} transparent opacity={0.85} />
      </Ring>
      <Ring ref={ringRef} args={[0.2, 0.6, 32]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <meshStandardMaterial color="#00ffcc" emissive="#00ffaa" emissiveIntensity={4} transparent opacity={0.9} />
      </Ring>
    </>
  );
});

const LeftHandMesh = React.memo(({ id }: { id: string }) => {
  const leftItem = useGameStore(s => s.worldState?.players[id]?.equippedLeftHand);
  if (!leftItem) return null;

  const isLight = leftItem.type === 'torch' || leftItem.type === 'lantern' || (leftItem.lightRadius && leftItem.lightRadius > 0);

  return (
    <group position={[-0.45, 0.4, 0.2]}>
      {isLight && (
        <>
          <LightMesh type={leftItem.type} color={leftItem.lightColor || '#ffaa44'} />
          <pointLight 
            color={leftItem.lightColor || '#ffaa44'} 
            intensity={leftItem.type === 'lantern' ? 9.0 : 7.0} 
            distance={leftItem.type === 'lantern' ? 26.0 : 18.0} 
            decay={1}
            position={[0, 0.5, 0]} 
          />
        </>
      )}
    </group>
  );
});

const BasePlayerLight = React.memo(({ id }: { id: string }) => {
  const leftItem = useGameStore(s => s.worldState?.players[id]?.equippedLeftHand);
  const rightItem = useGameStore(s => s.worldState?.players[id]?.equippedRightHand || s.worldState?.players[id]?.equippedWeapon);
  const hasLightItem = (leftItem && (leftItem.type === 'torch' || leftItem.type === 'lantern')) ||
                        (rightItem && (rightItem.type === 'torch' || rightItem.type === 'lantern'));

  if (hasLightItem) return null;

  return (
    <pointLight color="#fffaee" intensity={1.2} distance={3.5} decay={1.5} position={[0, 1.2, 0]} />
  );
});

const WeaponMesh = React.memo(({ id }: { id: string }) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const orbRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const worldState = useGameStore.getState().worldState;
    const player = worldState?.players[id];
    if (!groupRef.current) return;

    const weapon = player?.equippedRightHand || player?.equippedWeapon;
    if (!player || !weapon) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;
    const isSwinging = !!(worldState && player.lastSwingTick && (worldState.tick - player.lastSwingTick < 10));

    if (weapon.type === 'melee') {
      const len = weapon.length || 2.5;
      if (meshRef.current) {
        meshRef.current.scale.set(isSwinging ? 0.35 : 0.15, 0.15, len);
        meshRef.current.position.set(0, 0.5, len / 2 + 0.5);

        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.color.set(isSwinging ? '#ff1100' : '#ffaa00');
          mat.emissive.set(isSwinging ? '#ff3300' : '#ff5500');
          mat.emissiveIntensity = isSwinging ? 4.0 : 0.8;
        }
      }
      if (orbRef.current) orbRef.current.visible = false;
    } else if (weapon.type === 'torch' || weapon.type === 'lantern') {
      if (meshRef.current) meshRef.current.visible = false;
      if (orbRef.current) orbRef.current.visible = false;
    } else {
      // Heal Staff Mesh
      if (meshRef.current) {
        meshRef.current.scale.set(0.12, 1.8, 0.12);
        meshRef.current.position.set(0.4, 0.9, 0.2);
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.color.set('#553311');
          mat.emissive.set('#221100');
          mat.emissiveIntensity = 0.2;
        }
      }
      if (orbRef.current) {
        orbRef.current.visible = true;
        orbRef.current.position.set(0.4, 1.8, 0.2);
      }
    }
  });

  return (
    <group ref={groupRef}>
      <Box ref={meshRef} args={[1, 1, 1]} position={[0, 0.5, 1.5]}>
        <meshStandardMaterial color="#ffaa00" emissive="#ff5500" emissiveIntensity={0.8} />
      </Box>
      <Box ref={orbRef} args={[0.25, 0.25, 0.25]} position={[0.4, 1.8, 0.2]}>
        <meshStandardMaterial color="#00ffcc" emissive="#00ffaa" emissiveIntensity={3} />
      </Box>
    </group>
  );
});

export const Player = React.memo(({ id, isLocal }: { id: string; isLocal: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  const hpRef = useRef<HTMLDivElement>(null);

  useFrame((rootState, delta) => {
    const state = useGameStore.getState().worldState?.players[id];
    if (!state || !groupRef.current) return;

    const lerpFactor = 1 - Math.exp(-15 * delta);
    const serverPos = new THREE.Vector3(state.position.x, state.position.y, state.position.z);

    if (groupRef.current.position.distanceTo(serverPos) > 3) {
      groupRef.current.position.copy(serverPos);
    } else {
      groupRef.current.position.lerp(serverPos, lerpFactor);
    }

    if (state.heading !== undefined) {
      groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, state.heading, lerpFactor);
    }
    const targetPitch = state.hp <= 0 ? -Math.PI / 2.2 : 0;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetPitch, lerpFactor);

    if (isLocal) {
      const targetCamPos = new THREE.Vector3(groupRef.current.position.x, groupRef.current.position.y + 15, groupRef.current.position.z + 10);
      rootState.camera.position.lerp(targetCamPos, 1 - Math.exp(-10 * delta));
      rootState.camera.lookAt(groupRef.current.position);
    }

    if (!isLocal && hpRef.current) {
      const hpPercent = Math.max(0, state.hp / state.maxHp);
      hpRef.current.style.width = `${hpPercent * 100}%`;
      hpRef.current.style.background = hpPercent > 0.3 ? '#00ff00' : '#ff0000';
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <Box args={[1, 1, 1]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color={isLocal ? '#00ffcc' : '#ff00cc'} />
      </Box>

      <Box args={[0.2, 0.2, 0.2]} position={[0, 0.8, 0.5]}>
        <meshStandardMaterial color="#000000" />
      </Box>

      <WeaponMesh id={id} />
      <LeftHandMesh id={id} />
      <BasePlayerLight id={id} />
      <HealingAura id={id} />

      {/* Name Tag & HP Bar Overhead */}
      <Html position={[0, 1.4, 0]} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
          <div style={{ 
            color: isLocal ? '#00ffcc' : '#ffffff', 
            fontWeight: 'bold', 
            fontSize: '12px', 
            textShadow: '0 0 5px #000, 0 0 2px #000',
            whiteSpace: 'nowrap',
            marginBottom: '2px'
          }}>
            {useGameStore.getState().worldState?.players[id]?.name || (isLocal ? 'Hero' : 'Player')}
          </div>
          {!isLocal && (
            <div style={{ width: '40px', height: '6px', background: '#333', border: '1px solid black' }}>
              <div ref={hpRef} style={{ width: '100%', height: '100%', background: '#00ff00' }} />
            </div>
          )}
        </div>
      </Html>
    </group>
  );
});
