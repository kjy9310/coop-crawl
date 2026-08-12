import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { useGameStore } from './store/gameStore';
import { PeerManager } from './network/PeerManager';
import { GameScene } from './components/scene/GameScene';
import MobileControls from './components/MobileControls';
import { HUD } from './components/ui/HUD';
import { LobbyScreen } from './components/ui/LobbyScreen';
import { GoalModal } from './components/ui/GoalModal';
import { ArrivalToasts } from './components/ui/ArrivalToasts';
import { ReplayControlBar } from './components/ui/ReplayControlBar';
import { useWasmEngine } from './hooks/useWasmEngine';
import { useReplaySystem } from './hooks/useReplaySystem';
import { useGameInput } from './hooks/useGameInput';
import './index.css';

const isMobileDevice = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

function App() {
  const { isWasmLoaded } = useWasmEngine();
  const updateWorldState = useGameStore(s => s.updateWorldState);

  const [isHost, setIsHost] = useState(false);
  const isHostRef = useRef(false);
  const [isMobile] = useState(isMobileDevice);
  const [playerName, setPlayerName] = useState('Hero');
  const [roomId, setRoomId] = useState('test-room');
  const [started, setStarted] = useState(false);
  const [myId, setMyId] = useState<string>('');
  const [mapConfig, setMapConfig] = useState<any>(null);
  const [goalArrivals, setGoalArrivals] = useState<string[]>([]);
  const arrivedSetRef = useRef<Set<string>>(new Set());
  const peerManager = useRef<PeerManager | null>(null);

  const {
    isReplaying,
    setIsReplaying,
    isReplayingRef,
    replayBuffer,
    setReplayBuffer,
    replayIndex,
    setReplayIndex,
    isPlayingReplay,
    setIsPlayingReplay,
    replaySpeed,
    setReplaySpeed,
    showGoalModal,
    setShowGoalModal,
    showGoalModalRef,
    recordedEventsRef,
    mapSeedRef,
    buildReplayFramesFromEvents,
    handleLoadReplayFile,
    exportReplayFile,
  } = useReplaySystem();

  const { pointerPosRef, dispatchEvent, handleSelfHealEvent, handleDropEvent } = useGameInput({
    started,
    isReplayingRef,
    isHostRef,
    peerManager,
    recordedEventsRef
  });

  const processIncomingState = useCallback((state: any) => {
    if (!isReplayingRef.current) {
      updateWorldState(state);

      const playersList = Object.values(state.players || {}) as any[];
      const alivePlayers = playersList.filter((p: any) => p.hp > 0);
      const goal = state.goalPoint || state.exitPoint;

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
        const totalTicks = state.tick || 0;
        const { frames } = buildReplayFramesFromEvents(mapSeedRef.current, recordedEventsRef.current, totalTicks);
        setReplayBuffer(frames);
      }
    }
  }, [buildReplayFramesFromEvents, isReplayingRef, mapSeedRef, recordedEventsRef, setReplayBuffer, setShowGoalModal, showGoalModalRef, updateWorldState]);

  useEffect(() => {
    if (!started) return;

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

    return () => {
      if (tickInterval) clearInterval(tickInterval);
    };
  }, [started, processIncomingState]);

  const startGame = (host: boolean) => {
    setIsHost(host);
    isHostRef.current = host;
    setStarted(true);

    const pm = new PeerManager(host, roomId);
    peerManager.current = pm;

    const setupHost = (peerId: string) => {
      setMyId(peerId);
      if (host && window.wasmInitState) {
        window.wasmInitState();
        const seed = Date.now();
        mapSeedRef.current = seed;
        const mapJson = window.wasmGenerateMap(seed);
        setMapConfig(JSON.parse(mapJson));

        const joinEv = { type: 'join', playerId: peerId, name: playerName, tick: 0 };
        recordedEventsRef.current.push(joinEv);
        window.wasmApplyEvent(JSON.stringify(joinEv));

        pm.onEvent = (eventStr) => {
          try {
            const ev = JSON.parse(eventStr);
            recordedEventsRef.current.push(ev);
            if (ev.type === 'join') {
              pm.sendEvent({ type: 'map', seed });
              window.wasmApplyEvent(eventStr);
            } else {
              window.wasmApplyEvent(eventStr);
            }
          } catch (e) { console.error(e); }
        };
      }
    };

    if (pm.peerId) {
      setupHost(pm.peerId);
    }
    pm.onConnect = (peerId) => {
      setupHost(peerId);
    };

    if (!host) {
      pm.onEvent = (eventStr) => {
        try {
          const ev = JSON.parse(eventStr);
          if (ev.type === 'map') {
            if (window.wasmInitState) {
              window.wasmInitState();
              const mapJson = window.wasmGenerateMap(ev.seed);
              setMapConfig(JSON.parse(mapJson));
              const joinEv = { type: 'join', playerId: pm.peerId, name: playerName, tick: 0 };
              pm.sendEvent(joinEv);
            }
          }
        } catch (e) { console.error(e); }
      };

      pm.onStateUpdate = (stateStr) => {
        try {
          const state = typeof stateStr === 'string' ? JSON.parse(stateStr) : stateStr;
          processIncomingState(state);
        } catch (e) { console.error(e); }
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
        type: 'attack',
        playerId: peerManager.current.peerId,
        tick: useGameStore.getState().worldState?.tick || 0,
        heading
      };
      dispatchEvent(event);
    }
  };

  // Mobile Handlers
  const handleMobileMove = useCallback((x: number, z: number) => {
    if (!peerManager.current || isReplayingRef.current) return;
    dispatchEvent({
      type: 'move',
      playerId: peerManager.current.peerId,
      tick: useGameStore.getState().worldState?.tick || 0,
      dir: { x, y: 0, z }
    });
  }, [dispatchEvent, isReplayingRef]);

  const handleMobileAim = useCallback((heading: number, arc: number, angularSpeed: number) => {
    if (!peerManager.current || isReplayingRef.current) return;
    dispatchEvent({
      type: 'aim',
      playerId: peerManager.current.peerId,
      tick: useGameStore.getState().worldState?.tick || 0,
      heading,
      angularSpeed,
      swingArc: arc
    });
  }, [dispatchEvent, isReplayingRef]);

  const handleMobileAttack = useCallback(() => {
    if (!peerManager.current || isReplayingRef.current) return;
    const player = useGameStore.getState().worldState?.players[peerManager.current.peerId];
    const heading = player?.heading ?? 0;
    dispatchEvent({
      type: 'attack',
      playerId: peerManager.current.peerId,
      tick: useGameStore.getState().worldState?.tick || 0,
      heading
    });
  }, [dispatchEvent, isReplayingRef]);

  const handleMobilePickup = useCallback(() => {
    if (!peerManager.current || isReplayingRef.current) return;
    const ws = useGameStore.getState().worldState;
    if (!ws) return;
    const player = ws.players[peerManager.current.peerId];
    if (!player) return;

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
      dispatchEvent({
        type: 'pickup',
        playerId: peerManager.current.peerId,
        tick: ws.tick || 0,
        itemId: nearestId
      });
    }
  }, [dispatchEvent, isReplayingRef]);

  if (!isWasmLoaded) {
    return <div style={{ color: 'white', padding: 20 }}>Loading Wasm Engine...</div>;
  }

  const canvasHeight = isMobile && started ? '60%' : '100%';

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a1a', position: 'relative', overflow: 'hidden' }}>
      {!started && (
        <LobbyScreen
          playerName={playerName}
          setPlayerName={setPlayerName}
          roomId={roomId}
          setRoomId={setRoomId}
          onStartGame={startGame}
          onLoadReplayFile={(e) => handleLoadReplayFile(e, (config) => {
            if (config) setMapConfig(config);
            setStarted(true);
          })}
        />
      )}

      <ArrivalToasts arrivals={goalArrivals} />

      {showGoalModal && !isReplaying && (
        <GoalModal
          onWatchReplay={() => {
            setIsReplaying(true);
            setReplayIndex(0);
            setIsPlayingReplay(true);
          }}
          onExportReplay={exportReplayFile}
        />
      )}

      {isReplaying && (
        <ReplayControlBar
          replayIndex={replayIndex}
          setReplayIndex={setReplayIndex}
          replayBuffer={replayBuffer}
          isPlayingReplay={isPlayingReplay}
          setIsPlayingReplay={setIsPlayingReplay}
          replaySpeed={replaySpeed}
          setReplaySpeed={setReplaySpeed}
          onExitReplay={() => {
            setIsReplaying(false);
            showGoalModalRef.current = false;
            setShowGoalModal(false);
          }}
        />
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

      {isMobile && started && !isReplaying && (
        <MobileControls
          onMove={handleMobileMove}
          onAim={handleMobileAim}
          onAttack={handleMobileAttack}
          onPickup={handleMobilePickup}
          onDrop={handleDropEvent}
          playerPositionRef={pointerPosRef}
        />
      )}
    </div>
  );
}

export default App;
