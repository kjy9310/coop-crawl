import { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { PeerManager } from '../network/PeerManager';

interface UseGameInputOptions {
  started: boolean;
  isReplayingRef: React.MutableRefObject<boolean>;
  isHostRef: React.MutableRefObject<boolean>;
  peerManager: React.MutableRefObject<PeerManager | null>;
  recordedEventsRef: React.MutableRefObject<any[]>;
}

export function useGameInput({
  started,
  isReplayingRef,
  isHostRef,
  peerManager,
  recordedEventsRef
}: UseGameInputOptions) {
  const keys = useRef<{ [key: string]: boolean }>({});
  const pointerPosRef = useRef({ x: 0, z: 0 });
  const accumulatedArcRef = useRef(0);
  const lastDeltaSignRef = useRef(0);

  const dispatchEvent = useCallback((event: any) => {
    if (!peerManager.current || isReplayingRef.current) return;
    recordedEventsRef.current.push(event);

    if (isHostRef.current) {
      if (window.wasmApplyEvent) {
        window.wasmApplyEvent(JSON.stringify(event));
      }
    } else {
      peerManager.current.sendEvent(event);
    }
  }, [isHostRef, isReplayingRef, peerManager, recordedEventsRef]);

  const handleSelfHealEvent = useCallback(() => {
    if (!peerManager.current || isReplayingRef.current) return;
    const ev = {
      type: 'attack',
      playerId: peerManager.current.peerId,
      tick: useGameStore.getState().worldState?.tick || 0,
      isSelfCast: true
    };
    dispatchEvent(ev);
  }, [dispatchEvent, isReplayingRef, peerManager]);

  const handleDropEvent = useCallback(() => {
    if (!peerManager.current || isReplayingRef.current) return;
    const ev = {
      type: 'drop',
      playerId: peerManager.current.peerId,
      tick: useGameStore.getState().worldState?.tick || 0
    };
    dispatchEvent(ev);
  }, [dispatchEvent, isReplayingRef, peerManager]);

  const handlePickupEvent = useCallback((e: Event) => {
    const customEvent = e as CustomEvent;
    if (!peerManager.current || isReplayingRef.current) return;
    const ev = {
      type: 'pickup',
      playerId: peerManager.current.peerId,
      tick: useGameStore.getState().worldState?.tick || 0,
      itemId: customEvent.detail.itemId
    };
    dispatchEvent(ev);
  }, [dispatchEvent, isReplayingRef, peerManager]);

  useEffect(() => {
    if (!started) return;

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
        const length = Math.sqrt(x * x + z * z);
        x /= length;
        z /= length;
      }

      if (x !== lastSentDir.x || z !== lastSentDir.z) {
        lastSentDir = { x, z };
        const event = {
          type: 'move',
          playerId: peerManager.current.peerId,
          tick: useGameStore.getState().worldState?.tick || 0,
          dir: { x, y: 0, z }
        };
        dispatchEvent(event);
      }

      // Aim / Heading & Angular Speed
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

        const angularSpeed = deltaAngle / 0.05;

        if (Math.abs(deltaAngle) > 0.03) {
          lastSentHeading = heading;
          const aimEvent = {
            type: 'aim',
            playerId: peerManager.current.peerId,
            tick: useGameStore.getState().worldState?.tick || 0,
            heading,
            angularSpeed,
            swingArc: accumulatedArcRef.current
          };
          dispatchEvent(aimEvent);
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReplayingRef.current) return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        keys.current[key] = true;
      }
      if (key === 'g') handleDropEvent();
      if (key === 'e') handleSelfHealEvent();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        keys.current[key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('requestPickup', handlePickupEvent);
    window.addEventListener('requestDrop', handleDropEvent);
    window.addEventListener('requestSelfHeal', handleSelfHealEvent);

    return () => {
      clearInterval(movementInterval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('requestPickup', handlePickupEvent);
      window.removeEventListener('requestDrop', handleDropEvent);
      window.removeEventListener('requestSelfHeal', handleSelfHealEvent);
    };
  }, [started, dispatchEvent, handleDropEvent, handlePickupEvent, handleSelfHealEvent, isReplayingRef, peerManager]);

  return {
    pointerPosRef,
    dispatchEvent,
    handleSelfHealEvent,
    handleDropEvent,
  };
}
