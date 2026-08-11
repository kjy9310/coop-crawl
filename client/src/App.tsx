import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Box, Stats, Instances, Instance, Html } from '@react-three/drei';
import { useGameStore } from './store/gameStore';
import { PeerManager } from './network/PeerManager';
import { Player } from './components/Player';
import { Enemy } from './components/Enemy';
import { GroundItem } from './components/GroundItem';
import { Projectile } from './components/Projectile';
import MobileControls from './components/MobileControls';
import './index.css';
import sampleMap from './maps/sampleMap.json';

const isMobileDevice = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// Declare global types for Wasm
declare global {
  interface Window {
    Go: any;
    wasmInitState: () => void;
    wasmLoadMap: (mapJson: string) => void;
    wasmGenerateMap: (seed: number) => string;
    wasmApplyEvent: (eventJson: string) => void;
    wasmTick: () => void;
    wasmGetState: () => string;
  }
}

const MapWalls = React.memo(({ walls }: { walls: any[] }) => {
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

const HUD = React.memo(({ myId, isHost, started }: any) => {
  const worldState = useGameStore(s => s.worldState);
  if (!started || !worldState) return null;

  return (
    <>
      <div style={{ position: 'absolute', top: 10, right: 10, color: 'white' }}>
        Role: {isHost ? 'Host' : 'Client'} | Tick: {worldState.tick}
      </div>
      
      {/* Local Player HUD */}
      {worldState.players[myId] && (
        <div style={{ 
          position: 'absolute', 
          bottom: 40, 
          left: '50%', 
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)',
          padding: '10px 20px',
          borderRadius: '8px',
          border: '2px solid #555',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '20px',
          width: '500px'
        }}>
          {/* HP & MP Bars */}
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', marginBottom: '2px', fontWeight: 'bold', fontSize: '12px' }}>
              HP: {Math.round(worldState.players[myId].hp)} / {worldState.players[myId].maxHp}
            </div>
            <div style={{ width: '100%', height: '12px', background: '#333', border: '1px solid black', marginBottom: '6px' }}>
              <div style={{ 
                width: `${Math.max(0, worldState.players[myId].hp / worldState.players[myId].maxHp) * 100}%`, 
                height: '100%', 
                background: (worldState.players[myId].hp / worldState.players[myId].maxHp) > 0.3 ? '#00ffcc' : '#ff0000',
                transition: 'width 0.2s'
              }} />
            </div>

            <div style={{ color: '#00ccff', marginBottom: '2px', fontWeight: 'bold', fontSize: '12px' }}>
              MP: {Math.round(worldState.players[myId].mp || 100)} / {worldState.players[myId].maxMp || 100}
            </div>
            <div style={{ width: '100%', height: '12px', background: '#333', border: '1px solid black' }}>
              <div style={{ 
                width: `${Math.max(0, (worldState.players[myId].mp || 100) / (worldState.players[myId].maxMp || 100)) * 100}%`, 
                height: '100%', 
                background: '#00aaff',
                transition: 'width 0.2s'
              }} />
            </div>
          </div>
          
          {/* Equipped Weapon Card */}
          <div style={{ flex: 1, color: 'white' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span>EQUIPMENT</span>
              {worldState.players[myId].equippedWeapon && (
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('requestDrop'))}
                  style={{
                    background: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                >
                  Drop (G)
                </button>
              )}
            </div>
            
            {/* Equipment Info DIV Card with Embedded Square Skill Button */}
            <div style={{ padding: '6px 8px', background: '#444', borderRadius: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px' }}>
              <div>
                {worldState.players[myId].equippedWeapon ? (
                  <>
                    <span style={{ color: '#00ff00', fontWeight: 'bold' }}>{worldState.players[myId].equippedWeapon?.name}</span>
                    <br/>
                    <span style={{ fontSize: '11px', color: '#dddddd' }}>
                      Dmg: {worldState.players[myId].equippedWeapon?.damage} | Range: {worldState.players[myId].equippedWeapon?.range || worldState.players[myId].equippedWeapon?.length || 0} | Speed: {worldState.players[myId].equippedWeapon?.projectileSpeed || worldState.players[myId].equippedWeapon?.minSwingSpeed || 0}
                    </span>
                  </>
                ) : (
                  <span style={{ color: '#aaa' }}>Unarmed (Melee)</span>
                )}
              </div>

              {/* Square Skill Button Embedded INSIDE Equipment DIV */}
              {worldState.players[myId].equippedWeapon?.skillType ? (() => {
                const p = worldState.players[myId];
                const weapon = p.equippedWeapon!;
                const cdMax = weapon.skillCooldown || 150;
                const mpCost = weapon.skillMPCost || 30;
                const skillLabel = weapon.skillName?.toUpperCase() || 'SKILL';

                const isCd = !!(p.lastSkillTick && (worldState.tick - p.lastSkillTick < cdMax));
                const progress = isCd ? Math.min(100, Math.max(0, ((cdMax - (worldState.tick - p.lastSkillTick!)) / cdMax) * 100)) : 0;
                const remainingSec = isCd ? ((cdMax - (worldState.tick - p.lastSkillTick!)) / 30).toFixed(1) : '';

                return (
                  <div 
                    onClick={() => !isCd && window.dispatchEvent(new CustomEvent('requestSelfHeal'))}
                    title={`${weapon.skillName || 'Skill'} (E) [-${mpCost} MP]`}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '6px',
                      background: isCd ? '#222' : '#00b359',
                      border: isCd ? '2px solid #666' : '2px solid #00ff88',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: isCd ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      boxShadow: isCd ? 'none' : '0 0 8px rgba(0, 255, 136, 0.4)',
                      userSelect: 'none',
                      flexShrink: 0,
                      marginLeft: '8px'
                    }}
                  >
                    {/* Vertical Dark Overlay filling up from bottom during cooldown */}
                    {isCd && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${progress}%`,
                        background: 'rgba(0, 0, 0, 0.75)',
                        transition: 'height 0.05s linear'
                      }} />
                    )}
                    
                    <span style={{ fontSize: '13px', fontWeight: 'bold', zIndex: 2, color: isCd ? '#aaa' : 'white', lineHeight: '1.1' }}>E</span>
                    <span style={{ fontSize: '7.5px', fontWeight: 'bold', zIndex: 2, color: isCd ? '#00ff88' : '#aaffcc', lineHeight: '1' }}>
                      {isCd ? `${remainingSec}s` : skillLabel}
                    </span>
                    <span style={{ fontSize: '7px', fontWeight: 'bold', zIndex: 2, color: isCd ? '#888' : '#00ffff', marginTop: '1px' }}>
                      {mpCost} MP
                    </span>
                  </div>
                );
              })() : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

const GoalZone = React.memo(({ position }: { position?: { x: number; y: number; z: number } }) => {
  if (!position || (position.x === 0 && position.z === 0)) return null;

  return (
    <group position={[position.x, 0.05, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 1.8, 32]} />
        <meshStandardMaterial color="#ffcc00" emissive="#ffaa00" emissiveIntensity={6} transparent opacity={0.85} />
      </mesh>

      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.3, 0.8, 3, 16]} />
        <meshStandardMaterial color="#fff000" emissive="#ffdd00" emissiveIntensity={4} transparent opacity={0.35} />
      </mesh>

      <Html position={[0, 3.5, 0]} center style={{ pointerEvents: 'none', color: '#ffe600', fontWeight: 'bold', fontSize: '14px', textShadow: '0 0 8px #000', userSelect: 'none' }}>
        🚩 GOAL 🚩
      </Html>
    </group>
  );
});

const GameScene = React.memo(({ myId, mapConfig, handlePointerDown, pointerPosRef }: any) => {
  const worldState = useGameStore(s => s.worldState);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {/* Render Players */}
      {worldState?.players && Object.keys(worldState.players).map(id => (
        <Player key={id} id={id} isLocal={id === myId} />
      ))}
      
      {/* Render Enemies */}
      {worldState?.enemies && Object.keys(worldState.enemies).map(id => (
        <Enemy key={id} id={id} />
      ))}
      
      {/* Render Ground Items */}
      {worldState?.items && Object.values(worldState.items).map(item => (
        <GroundItem key={item.id} id={item.id} item={item} myId={myId} />
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
      
      {/* Render Goal Zone */}
      {worldState?.goalPoint && <GoalZone position={worldState.goalPoint} />}
      
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

function App() {
  const isWasmLoaded = useGameStore(s => s.isWasmLoaded);
  const setWasmLoaded = useGameStore(s => s.setWasmLoaded);
  const updateWorldState = useGameStore(s => s.updateWorldState);
  const [isHost, setIsHost] = useState(false);
  const isHostRef = useRef(false);
  const [isMobile] = useState(isMobileDevice);
  const [playerName, setPlayerName] = useState('Hero');
  const [roomId, setRoomId] = useState('test-room');
  const playerPositionRef = useRef({ x: 0, z: 0 });
  const [started, setStarted] = useState(false);
  const [myId, setMyId] = useState<string>('');
  const [mapConfig, setMapConfig] = useState<any>(null);
  const peerManager = useRef<PeerManager | null>(null);
  
  // Replay System State
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayBuffer, setReplayBuffer] = useState<any[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlayingReplay, setIsPlayingReplay] = useState(true);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalArrivals, setGoalArrivals] = useState<string[]>([]);  // names of players who arrived
  const arrivedSetRef = useRef<Set<string>>(new Set());             // tracks IDs already announced
  const recordedHistoryRef = useRef<any[]>([]);
  const recordedEventsRef = useRef<any[]>([]);
  const mapSeedRef = useRef<number>(Date.now());
  const showGoalModalRef = useRef(false);
  const isReplayingRef = useRef(false);
  isReplayingRef.current = isReplaying;

  // WASD movement tracking & Mouse Swing Arc tracking
  const keys = useRef<{ [key: string]: boolean }>({});
  const pointerPosRef = useRef({ x: 0, z: 0 });
  const accumulatedArcRef = useRef(0);
  const lastDeltaSignRef = useRef(0);

  useEffect(() => {
    const loadWasm = async () => {
      try {
        if (!window.Go) {
          const script = document.createElement('script');
          script.src = '/wasm/wasm_exec.js';
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });
        }
        
        const go = new window.Go();
        go.importObject.env['syscall/js.finalizeRef'] = () => {};

        const res = await fetch(`/wasm/engine.wasm?t=${Date.now()}`);
        const buffer = await res.arrayBuffer();
        const module = await WebAssembly.instantiate(buffer, go.importObject);
        go.run(module.instance);
        setWasmLoaded(true);
      } catch (err) {
        console.error("Wasm Loading Error:", err);
      }
    };

    loadWasm();
  }, []);

  // Replay Playback Timer
  useEffect(() => {
    if (!isReplaying || !isPlayingReplay || replayBuffer.length === 0) return;
    const interval = setInterval(() => {
      setReplayIndex(prev => {
        if (prev >= replayBuffer.length - 1) {
          setIsPlayingReplay(false);
          return prev;
        }
        const next = prev + 1;
        useGameStore.getState().updateWorldState(replayBuffer[next]);
        return next;
      });
    }, (1000 / 30) / replaySpeed);

    return () => clearInterval(interval);
  }, [isReplaying, isPlayingReplay, replayBuffer, replaySpeed]);

  useEffect(() => {
    if (!started) return;

    // Host Game Loop (inside useEffect for proper cleanup)
    let tickInterval: ReturnType<typeof setInterval> | null = null;
    if (isHostRef.current) {
      tickInterval = setInterval(() => {
        if (window.wasmTick && peerManager.current) {
          window.wasmTick();
          const stateStr = window.wasmGetState();
          const state = JSON.parse(stateStr);
          processIncomingState(state);
          peerManager.current.broadcastState(state);
        }
      }, 1000 / 30);
    }

    let lastSentDir = { x: 0, z: 0 };
    let lastSentHeading = 0;

    const movementInterval = setInterval(() => {
      if (!peerManager.current || isReplayingRef.current) return;
      
      let x = 0;
      let z = 0;
      if (keys.current['w']) z -= 1;
      if (keys.current['s']) z += 1;
      if (keys.current['a']) x -= 1;
      if (keys.current['d']) x += 1;

      if (x !== 0 && z !== 0) {
        const length = Math.sqrt(x*x + z*z);
        x /= length;
        z /= length;
      }

      if (x !== lastSentDir.x || z !== lastSentDir.z) {
        lastSentDir = { x, z };
        
        const event = {
          type: "move",
          playerId: peerManager.current.peerId,
          tick: useGameStore.getState().worldState?.tick || 0,
          dir: { x, y: 0, z }
        };

        if (isHostRef.current) {
          window.wasmApplyEvent(JSON.stringify(event));
        } else {
          peerManager.current.sendEvent(event);
        }
      }

      // Aim / Heading & Angular Speed & Swing Arc Accumulation
      const player = useGameStore.getState().worldState?.players[peerManager.current.peerId];
      if (player) {
        const dx = pointerPosRef.current.x - player.position.x;
        const dz = pointerPosRef.current.z - player.position.z;
        const heading = Math.atan2(dx, dz);
        
        let deltaAngle = heading - lastSentHeading;
        while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
        while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
        
        const currentSign = Math.sign(deltaAngle);
        if (currentSign !== 0 && currentSign === lastDeltaSignRef.current) {
          accumulatedArcRef.current += Math.abs(deltaAngle);
        } else if (currentSign !== 0) {
          accumulatedArcRef.current = Math.abs(deltaAngle);
          lastDeltaSignRef.current = currentSign;
        }

        const angularSpeed = deltaAngle / 0.05; // 50ms interval = 0.05s
        
        if (Math.abs(deltaAngle) > 0.03) {
          lastSentHeading = heading;
          const aimEvent = {
            type: "aim",
            playerId: peerManager.current.peerId,
            tick: useGameStore.getState().worldState?.tick || 0,
            heading: heading,
            angularSpeed: angularSpeed,
            swingArc: accumulatedArcRef.current
          };
          if (isHostRef.current) {
            window.wasmApplyEvent(JSON.stringify(aimEvent));
          } else {
            peerManager.current.sendEvent(aimEvent);
          }
        }
      }
    }, 50); // Poll every 50ms

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReplayingRef.current) return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        keys.current[key] = true;
      }
      if (key === 'g') {
        handleDropEvent();
      }
      if (key === 'e') {
        handleSelfHealEvent();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        keys.current[key] = false;
      }
    };
    const handleSelfHealEvent = () => {
      if (peerManager.current && !isReplayingRef.current) {
        const ev = {
          type: "attack",
          playerId: peerManager.current.peerId,
          tick: useGameStore.getState().worldState?.tick || 0,
          isSelfCast: true
        };
        if (isHostRef.current) {
          window.wasmApplyEvent(JSON.stringify(ev));
        } else {
          peerManager.current.sendEvent(ev);
        }
      }
    };
    const handleDropEvent = () => {
      if (peerManager.current && !isReplayingRef.current) {
        const ev = {
          type: "drop",
          playerId: peerManager.current.peerId,
          tick: useGameStore.getState().worldState?.tick || 0,
        };
        if (isHostRef.current) {
          window.wasmApplyEvent(JSON.stringify(ev));
        } else {
          peerManager.current.sendEvent(ev);
        }
      }
    };
    const handlePickupEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (peerManager.current && !isReplayingRef.current) {
        const ev = {
          type: "pickup",
          playerId: peerManager.current.peerId,
          tick: useGameStore.getState().worldState?.tick || 0,
          itemId: customEvent.detail.itemId
        };
        if (isHostRef.current) {
          window.wasmApplyEvent(JSON.stringify(ev));
        } else {
          peerManager.current.sendEvent(ev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('requestPickup', handlePickupEvent);
    window.addEventListener('requestDrop', handleDropEvent);
    window.addEventListener('requestSelfHeal', handleSelfHealEvent);

    return () => {
      if (tickInterval) clearInterval(tickInterval);
      clearInterval(movementInterval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('requestPickup', handlePickupEvent);
      window.removeEventListener('requestDrop', handleDropEvent);
      window.removeEventListener('requestSelfHeal', handleSelfHealEvent);
    };
  }, [started]);

  const processIncomingState = (state: any) => {
    if (!isReplayingRef.current) {
      recordedHistoryRef.current.push(state);
      updateWorldState(state);

      // Check if ALL alive players in session have reached Goal Zone
      const playersList = Object.values(state.players || {}) as any[];
      const alivePlayers = playersList.filter((p: any) => p.hp > 0);
      const goal = state.goalPoint || state.exitPoint;

      // Per-player arrival notification
      alivePlayers.forEach((p: any) => {
        const atGoal = p.reachedGoal || (goal && (goal.x !== 0 || goal.z !== 0) &&
          Math.sqrt((p.position.x - goal.x) ** 2 + (p.position.z - goal.z) ** 2) <= 2.5);
        if (atGoal && !arrivedSetRef.current.has(p.id)) {
          arrivedSetRef.current.add(p.id);
          const displayName = p.name || p.id.slice(0, 8);
          setGoalArrivals(prev => [...prev, displayName]);
        }
      });

      const allReached = alivePlayers.length > 0 && alivePlayers.every((p: any) => {
        if (p.reachedGoal) return true;
        if (goal && (goal.x !== 0 || goal.z !== 0)) {
          const dx = p.position.x - goal.x;
          const dz = p.position.z - goal.z;
          return Math.sqrt(dx * dx + dz * dz) <= 2.5;
        }
        return false;
      });

      if (allReached && !showGoalModalRef.current) {
        showGoalModalRef.current = true;
        setShowGoalModal(true);
        const historyCopy = [...recordedHistoryRef.current];
        setReplayBuffer(historyCopy);
      }
    }
  };

  const startGame = (host: boolean) => {
    setIsHost(host);
    isHostRef.current = host;
    setStarted(true);

    const pm = new PeerManager(host, roomId);
    peerManager.current = pm;
    setMyId(pm.peerId);
    
    if (host && window.wasmInitState) {
      window.wasmInitState();
      const seed = Date.now();
      const mapJson = window.wasmGenerateMap(seed);
      setMapConfig(JSON.parse(mapJson));
      window.wasmApplyEvent(JSON.stringify({ type: "join", playerId: pm.peerId, name: playerName, tick: 0 }));
      
      pm.onEvent = (eventStr) => {
        try {
          const ev = JSON.parse(eventStr);
          if (ev.type === "join") {
            pm.sendEvent({ type: "map", seed: seed });
            window.wasmApplyEvent(eventStr);
          } else {
            window.wasmApplyEvent(eventStr);
          }
        } catch (e) { console.error(e) }
      };
    } else if (!host) {
      pm.onEvent = (eventStr) => {
        try {
          const ev = JSON.parse(eventStr);
          if (ev.type === "map") {
            if (window.wasmInitState) {
              window.wasmInitState();
              const mapJson = window.wasmGenerateMap(ev.seed);
              setMapConfig(JSON.parse(mapJson));
              pm.sendEvent({ type: "join", playerId: pm.peerId, name: playerName, tick: 0 });
            }
          }
        } catch (e) { console.error(e) }
      };
    }

    if (!host) {
      // Client receives state
      pm.onStateUpdate = (stateStr) => {
        try {
          const state = typeof stateStr === 'string' ? JSON.parse(stateStr) : stateStr;
          processIncomingState(state);
        } catch (e) { console.error(e) }
      };
    }
  };

  const handlePointerDown = (e: any) => {
    if (!started || !peerManager.current || isReplayingRef.current) return;
    const point = e.point;
    
    const player = useGameStore.getState().worldState?.players[peerManager.current.peerId];
    if (player && player.equippedWeapon && player.equippedWeapon.type === 'ranged') {
      const dx = point.x - player.position.x;
      const dz = point.z - player.position.z;
      const heading = Math.atan2(dx, dz);
      
      const event = {
        type: "attack",
        playerId: peerManager.current.peerId,
        tick: useGameStore.getState().worldState?.tick || 0,
        heading: heading
      };
      if (isHostRef.current) {
        window.wasmApplyEvent(JSON.stringify(event));
      } else {
        peerManager.current.sendEvent(event);
      }
    }
  };

  // Mobile move handler (called from MobileControls joystick)
  const handleMobileMove = useCallback((x: number, z: number) => {
    if (!peerManager.current || isReplayingRef.current) return;
    const event = {
      type: 'move',
      playerId: peerManager.current.peerId,
      tick: useGameStore.getState().worldState?.tick || 0,
      dir: { x, y: 0, z }
    };
    if (isHostRef.current) {
      window.wasmApplyEvent(JSON.stringify(event));
    } else {
      peerManager.current.sendEvent(event);
    }
  }, []);

  const handleMobileAim = useCallback((heading: number, arc: number, angularSpeed: number) => {
    if (!peerManager.current || isReplayingRef.current) return;
    const aimEvent = {
      type: 'aim',
      playerId: peerManager.current.peerId,
      tick: useGameStore.getState().worldState?.tick || 0,
      heading,
      angularSpeed,
      swingArc: arc
    };
    if (isHostRef.current) {
      window.wasmApplyEvent(JSON.stringify(aimEvent));
    } else {
      peerManager.current.sendEvent(aimEvent);
    }
  }, []);

  const handleMobileAttack = useCallback(() => {
    if (!peerManager.current || isReplayingRef.current) return;
    // Use the player's current heading from game state (set by last aim/swipe)
    // This ensures tap fires in the direction the player is already facing
    const player = useGameStore.getState().worldState?.players[peerManager.current.peerId];
    const heading = player?.heading ?? 0;
    const event = {
      type: 'attack',
      playerId: peerManager.current.peerId,
      tick: useGameStore.getState().worldState?.tick || 0,
      heading
    };
    if (isHostRef.current) {
      window.wasmApplyEvent(JSON.stringify(event));
    } else {
      peerManager.current.sendEvent(event);
    }
  }, []);

  const handleMobilePickup = useCallback(() => {
    if (!peerManager.current || isReplayingRef.current) return;
    const ws = useGameStore.getState().worldState;
    if (!ws) return;
    const player = ws.players[peerManager.current.peerId];
    if (!player) return;

    // Find nearest ground item within pickup range (2.5 units)
    let nearestId: string | null = null;
    let nearestDist = 2.5;
    Object.values(ws.items || {}).forEach((item: any) => {
      const dx = item.position.x - player.position.x;
      const dz = item.position.z - player.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < nearestDist) {
        nearestDist = d;
        nearestId = item.id;
      }
    });

    if (nearestId) {
      const ev = {
        type: 'pickup',
        playerId: peerManager.current.peerId,
        tick: ws.tick || 0,
        itemId: nearestId
      };
      if (isHostRef.current) {
        window.wasmApplyEvent(JSON.stringify(ev));
      } else {
        peerManager.current.sendEvent(ev);
      }
    }
  }, []);

  const handleMobileDrop = useCallback(() => {
    window.dispatchEvent(new CustomEvent('requestDrop'));
  }, []);

  if (!isWasmLoaded) {
    return <div style={{ color: 'white', padding: 20 }}>Loading Wasm Engine...</div>;
  }

  // Portrait layout: top 60% = game, bottom 40% = controls
  const canvasHeight = isMobile && started ? '60%' : '100%';

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a1a', position: 'relative', overflow: 'hidden' }}>
      
      {!started && (
        <div style={{
          position: 'absolute',
          zIndex: 10,
          padding: '25px 30px',
          background: 'rgba(0,0,0,0.85)',
          color: 'white',
          borderRadius: '10px',
          border: '1px solid #444',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          left: '20px',
          top: '20px',
          boxShadow: '0 0 20px rgba(0,0,0,0.8)'
        }}>
          <h2 style={{ margin: 0, color: '#00ffcc', fontSize: '20px' }}>Co-op Roguelike MVP</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: '#aaa', fontWeight: 'bold' }}>Character Name (캐릭터 이름):</label>
            <input 
              value={playerName} 
              onChange={e => setPlayerName(e.target.value)} 
              placeholder="Character Name" 
              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #555', background: '#222', color: 'white', fontSize: '14px' }} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: '#aaa', fontWeight: 'bold' }}>Room ID (방 이름):</label>
            <input 
              value={roomId} 
              onChange={e => setRoomId(e.target.value)} 
              placeholder="Room ID" 
              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #555', background: '#222', color: 'white', fontSize: '14px' }} 
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
            <button 
              onClick={() => startGame(true)} 
              style={{ flex: 1, padding: '10px', background: '#00cc66', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
            >
              Create Room (Host)
            </button>
            <button 
              onClick={() => startGame(false)} 
              style={{ flex: 1, padding: '10px', background: '#0088ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
            >
              Join Room (Client)
            </button>
          </div>
        </div>
      )}

      {/* Goal Arrival Notification - right side panel */}
      {goalArrivals.length > 0 && !showGoalModal && (
        <div style={{
          position: 'absolute',
          top: 60,
          right: 14,
          zIndex: 150,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}>
          {goalArrivals.map((name, i) => (
            <div key={i} style={{
              background: 'rgba(0,0,0,0.82)',
              border: '1.5px solid #ffcc00',
              borderRadius: 8,
              padding: '8px 14px',
              color: 'white',
              fontSize: 13,
              fontWeight: 'bold',
              boxShadow: '0 0 12px rgba(255,204,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              animation: 'slideIn 0.3s ease',
              whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: 16 }}>🚩</span>
              <span>
                <span style={{ color: '#ffcc00' }}>{name}</span>
                <span style={{ color: '#ccc', fontWeight: 'normal' }}> 도착지점 도착!</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Goal Reached Celebration Modal */}
      {showGoalModal && !isReplaying && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 200,
          background: 'rgba(0,0,0,0.92)',
          border: '3px solid #ffcc00',
          borderRadius: '12px',
          padding: '25px 35px',
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 0 35px rgba(255, 204, 0, 0.6)'
        }}>
          <h1 style={{ color: '#ffcc00', margin: '0 0 10px 0', fontSize: '26px' }}>🎉 GOAL REACHED! 🎉</h1>
          <p style={{ color: '#dddddd', fontSize: '14px', marginBottom: '20px' }}>
            도착지점에 성공적으로 도착했습니다! 리플레이 파일을 다운로드하거나 바로 감상하실 수 있습니다.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              onClick={() => {
                setIsReplaying(true);
                setReplayIndex(0);
                setIsPlayingReplay(true);
                if (replayBuffer.length > 0) {
                  useGameStore.getState().updateWorldState(replayBuffer[0]);
                }
              }}
              style={{
                background: '#00cc66',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ▶ Watch Replay (리플레이 보기)
            </button>
            <button 
              onClick={() => {
                const replayPayload = {
                  version: "1.0",
                  timestamp: new Date().toISOString(),
                  seed: mapSeedRef.current,
                  totalTicks: useGameStore.getState().worldState?.tick || 0,
                  events: recordedEventsRef.current
                };

                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(replayPayload, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `replay_${Date.now()}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
              }}
              style={{
                background: '#0088ff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              💾 Save Replay File (.json)
            </button>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: '#555',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🔄 Play Again (다시하기)
            </button>
          </div>
        </div>
      )}

      {/* Replay Mode Control Bar */}
      {isReplaying && (
        <div style={{
          position: 'absolute',
          top: 15,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          background: 'rgba(0,0,0,0.85)',
          padding: '10px 20px',
          borderRadius: '8px',
          border: '2px solid #00ff88',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'white',
          boxShadow: '0 0 15px rgba(0,255,136,0.3)',
          userSelect: 'none'
        }}>
          <span style={{ fontWeight: 'bold', color: '#00ff88', fontSize: '13px' }}>🎬 REPLAY MODE</span>

          <button 
            onClick={() => setIsPlayingReplay(!isPlayingReplay)}
            style={{ background: '#333', color: 'white', border: '1px solid #777', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}
          >
            {isPlayingReplay ? '⏸ Pause' : '▶ Play'}
          </button>

          <button 
            onClick={() => { setReplayIndex(0); useGameStore.getState().updateWorldState(replayBuffer[0]); }}
            style={{ background: '#333', color: 'white', border: '1px solid #777', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}
          >
            ⏮ Restart
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="range" 
              min={0} 
              max={Math.max(0, replayBuffer.length - 1)} 
              value={replayIndex}
              onChange={(e) => {
                const idx = parseInt(e.target.value);
                setReplayIndex(idx);
                if (replayBuffer[idx]) {
                  useGameStore.getState().updateWorldState(replayBuffer[idx]);
                }
              }}
              style={{ width: '160px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', color: '#aaa' }}>
              {replayIndex} / {replayBuffer.length - 1}
            </span>
          </div>

          <select 
            value={replaySpeed} 
            onChange={(e) => setReplaySpeed(parseFloat(e.target.value))}
            style={{ background: '#333', color: 'white', border: '1px solid #777', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer', fontSize: '12px' }}
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1.0x</option>
            <option value={2}>2.0x</option>
          </select>

          <button 
            onClick={() => { setIsReplaying(false); setShowGoalModal(false); showGoalModalRef.current = false; }}
            style={{ background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
          >
            ❌ Exit Replay
          </button>
        </div>
      )}

      <div style={{ width: '100%', height: canvasHeight, position: 'relative' }}>
        <Canvas camera={{ position: [0, 15, 10], fov: 50 }}>
          <Stats />
          <GameScene 
            myId={myId} 
            mapConfig={mapConfig} 
            handlePointerDown={handlePointerDown} 
            pointerPosRef={pointerPosRef} 
          />
        </Canvas>
        <HUD myId={myId} isHost={isHost} started={started} />
      </div>

      {/* Mobile Controls - portrait bottom panel */}
      {isMobile && started && !isReplaying && (
        <MobileControls
          onMove={handleMobileMove}
          onAim={handleMobileAim}
          onAttack={handleMobileAttack}
          onPickup={handleMobilePickup}
          onDrop={handleMobileDrop}
          playerPositionRef={playerPositionRef}
        />
      )}
    </div>
  );
}

export default App;
