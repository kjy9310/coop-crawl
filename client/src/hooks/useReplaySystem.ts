import { useState, useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

export function useReplaySystem() {
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayBuffer, setReplayBuffer] = useState<any[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlayingReplay, setIsPlayingReplay] = useState(true);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [showGoalModal, setShowGoalModal] = useState(false);

  const recordedEventsRef = useRef<any[]>([]);
  const mapSeedRef = useRef<number>(Date.now());
  const showGoalModalRef = useRef(false);
  const isReplayingRef = useRef(false);
  isReplayingRef.current = isReplaying;

  const updateWorldState = useGameStore(s => s.updateWorldState);

  const buildReplayFramesFromEvents = useCallback((seed: number, events: any[], totalTicks: number) => {
    if (!window.wasmInitState || !window.wasmGenerateMap || !window.wasmApplyEvent || !window.wasmTick) {
      return { frames: [], mapConfig: null };
    }
    window.wasmInitState();
    const mapJson = window.wasmGenerateMap(seed);
    const mapConfig = JSON.parse(mapJson);

    const eventsByTick: Record<number, any[]> = {};
    events.forEach(ev => {
      const t = ev.tick || 0;
      if (!eventsByTick[t]) eventsByTick[t] = [];
      eventsByTick[t].push(ev);
    });

    const frames: any[] = [];
    for (let t = 0; t <= totalTicks; t++) {
      if (eventsByTick[t]) {
        eventsByTick[t].forEach(ev => {
          window.wasmApplyEvent(JSON.stringify(ev));
        });
      }
      window.wasmTick();
      const stateStr = window.wasmGetState();
      frames.push(JSON.parse(stateStr));
    }
    return { frames, mapConfig };
  }, []);

  const handleLoadReplayFile = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    onStartGame?: (mapConfig: any) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const payload = JSON.parse(event.target?.result as string);
        if (payload.seed !== undefined && payload.events) {
          const seed = payload.seed;
          const events = payload.events;
          const totalTicks = payload.totalTicks || 0;
          const { frames, mapConfig } = buildReplayFramesFromEvents(seed, events, totalTicks);
          if (frames.length > 0) {
            setReplayBuffer(frames);
            setIsReplaying(true);
            setReplayIndex(0);
            setIsPlayingReplay(true);
            if (onStartGame) onStartGame(mapConfig);
            useGameStore.getState().updateWorldState(frames[0]);
          }
        }
      } catch (err) {
        alert('Invalid replay file format!');
      }
    };
    reader.readAsText(file);
  }, [buildReplayFramesFromEvents]);

  const exportReplayFile = useCallback(() => {
    const replayPayload = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      seed: mapSeedRef.current,
      totalTicks: useGameStore.getState().worldState?.tick || 0,
      events: recordedEventsRef.current
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(replayPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `replay_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, []);

  // Replay Playback Timer (No state updates inside setReplayIndex reducer!)
  useEffect(() => {
    if (!isReplaying || !isPlayingReplay || replayBuffer.length === 0) return;
    const interval = setInterval(() => {
      setReplayIndex(prev => {
        if (prev >= replayBuffer.length - 1) {
          setIsPlayingReplay(false);
          return prev;
        }
        return prev + 1;
      });
    }, (1000 / 30) / replaySpeed);

    return () => clearInterval(interval);
  }, [isReplaying, isPlayingReplay, replayBuffer.length, replaySpeed]);

  // Sync WorldState store with current replayIndex frame safely in effect phase
  useEffect(() => {
    if (isReplaying && replayBuffer[replayIndex]) {
      updateWorldState(replayBuffer[replayIndex]);
    }
  }, [isReplaying, replayIndex, replayBuffer, updateWorldState]);

  return {
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
  };
}
