import React, { useRef, useCallback, useEffect } from 'react';

interface MobileControlsProps {
  onMove: (x: number, z: number) => void;
  onAim: (heading: number, arc: number, angularSpeed: number) => void;
  onAttack: () => void;
  onPickup: () => void;
  onDrop: () => void;
  playerPositionRef: React.MutableRefObject<{ x: number; z: number }>;
}

const JOYSTICK_RADIUS = 56;
const KNOB_RADIUS = 22;

export default function MobileControls({
  onMove, onAim, onAttack, onPickup, onDrop, playerPositionRef
}: MobileControlsProps) {
  // ── Joystick state ─────────────────────────────────────────
  const joyBaseRef = useRef<HTMLDivElement>(null);
  const joyKnobRef = useRef<HTMLDivElement>(null);
  const joyTouchId = useRef<number | null>(null);
  const joyOrigin = useRef({ x: 0, y: 0 });

  const updateJoystick = useCallback((cx: number, cy: number) => {
    const ox = joyOrigin.current.x;
    const oy = joyOrigin.current.y;
    let dx = cx - ox;
    let dy = cy - oy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, JOYSTICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;

    if (joyKnobRef.current) {
      joyKnobRef.current.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
    }

    // dx → game X, dy → game Z (screen Y is world -Z in our cam)
    const norm = dist > 6 ? clamped / JOYSTICK_RADIUS : 0;
    const mx = norm > 0 ? Math.cos(angle) * norm : 0;
    const mz = norm > 0 ? Math.sin(angle) * norm : 0;
    // Screen X → world X, screen Y → world Z
    onMove(mx, mz);
  }, [onMove]);

  const resetJoystick = useCallback(() => {
    if (joyKnobRef.current) {
      joyKnobRef.current.style.transform = 'translate(-50%, -50%)';
    }
    onMove(0, 0);
  }, [onMove]);

  // Joystick touch handlers
  const onJoyStart = useCallback((e: React.TouchEvent) => {
    if (joyTouchId.current !== null) return;
    const t = e.changedTouches[0];
    joyTouchId.current = t.identifier;
    const rect = joyBaseRef.current!.getBoundingClientRect();
    joyOrigin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    updateJoystick(t.clientX, t.clientY);
  }, [updateJoystick]);

  const onJoyMove = useCallback((e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyTouchId.current) {
        updateJoystick(t.clientX, t.clientY);
        break;
      }
    }
  }, [updateJoystick]);

  const onJoyEnd = useCallback((e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId.current) {
        joyTouchId.current = null;
        resetJoystick();
        break;
      }
    }
  }, [resetJoystick]);

  // ── Attack zone (right side): swipe = swing arc, tap = ranged/heal ──
  const atkTouchId = useRef<number | null>(null);
  const atkStart = useRef({ x: 0, y: 0, time: 0 });
  const lastHeading = useRef(0);
  const lastSign = useRef(0);
  const accArc = useRef(0);

  const onAtkStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (atkTouchId.current !== null) return;
    const t = e.changedTouches[0];
    atkTouchId.current = t.identifier;
    atkStart.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    accArc.current = 0;
    lastSign.current = 0;
    // Initial heading from player toward touch world projection (approximated)
    lastHeading.current = 0;
  }, []);

  const onAtkMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== atkTouchId.current) continue;

      // Swipe dx/dy → heading angle in game world
      const dx = t.clientX - atkStart.current.x;
      const dy = t.clientY - atkStart.current.y;
      // Map screen swipe to world heading: swipe-right → world +X, swipe-up → world -Z
      const heading = Math.atan2(dx, -dy);

      let delta = heading - lastHeading.current;
      while (delta < -Math.PI) delta += Math.PI * 2;
      while (delta > Math.PI) delta -= Math.PI * 2;

      const sign = Math.sign(delta);
      if (sign !== 0 && sign === lastSign.current) {
        accArc.current += Math.abs(delta);
      } else if (sign !== 0) {
        accArc.current = Math.abs(delta);
        lastSign.current = sign;
      }

      const angularSpeed = delta / 0.016;
      lastHeading.current = heading;
      onAim(heading, accArc.current, angularSpeed);
      break;
    }
  }, [onAim]);

  const onAtkEnd = useCallback((e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== atkTouchId.current) continue;
      atkTouchId.current = null;

      const elapsed = Date.now() - atkStart.current.time;
      const dx = t.clientX - atkStart.current.x;
      const dy = t.clientY - atkStart.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Tap = short touch without much movement → attack/shoot
      if (elapsed < 220 && dist < 15) {
        onAttack();
      }
      break;
    }
  }, [onAttack]);

  // Register global touch listeners (to capture moves outside element)
  useEffect(() => {
    window.addEventListener('touchmove', onJoyMove, { passive: false });
    window.addEventListener('touchend', onJoyEnd, { passive: false });
    window.addEventListener('touchmove', onAtkMove, { passive: false });
    window.addEventListener('touchend', onAtkEnd, { passive: false });
    return () => {
      window.removeEventListener('touchmove', onJoyMove);
      window.removeEventListener('touchend', onJoyEnd);
      window.removeEventListener('touchmove', onAtkMove);
      window.removeEventListener('touchend', onAtkEnd);
    };
  }, [onJoyMove, onJoyEnd, onAtkMove, onAtkEnd]);

  return (
    <div style={{
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      height: '40%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px 0 20px',
      paddingRight: 60,  /* safe zone from right edge (browser back gesture) */
      background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)',
      pointerEvents: 'none',
      userSelect: 'none',
      zIndex: 50,
    }}>
      {/* ── Left: Joystick + skill buttons ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, pointerEvents: 'auto' }}>
        {/* Virtual Joystick */}
        <div
          ref={joyBaseRef}
          onTouchStart={onJoyStart}
          style={{
            width: JOYSTICK_RADIUS * 2,
            height: JOYSTICK_RADIUS * 2,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            border: '2px solid rgba(255,255,255,0.35)',
            position: 'relative',
            touchAction: 'none',
            boxShadow: '0 0 18px rgba(0,255,200,0.15)',
          }}
        >
          <div
            ref={joyKnobRef}
            style={{
              width: KNOB_RADIUS * 2,
              height: KNOB_RADIUS * 2,
              borderRadius: '50%',
              background: 'rgba(0,255,200,0.55)',
              border: '2px solid rgba(0,255,200,0.9)',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 12px rgba(0,255,200,0.5)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Action buttons row */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onTouchStart={(e) => { e.preventDefault(); onPickup(); }}
            style={btnStyle('#0088ff')}
          >
            👜<br/><span style={{ fontSize: 9 }}>줍기</span>
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); onDrop(); }}
            style={btnStyle('#cc6600')}
          >
            G<br/><span style={{ fontSize: 9 }}>버리기</span>
          </button>
        </div>
      </div>

      {/* ── Right: Attack zone (moved left from edge to avoid browser back gesture) ── */}
      <div
        onTouchStart={onAtkStart}
        style={{
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: 'rgba(255,60,60,0.13)',
          border: '2px solid rgba(255,80,80,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
          pointerEvents: 'auto',
          boxShadow: '0 0 18px rgba(255,60,60,0.15)',
          flexShrink: 0,
          marginRight: 0,  /* paddingRight on parent already gives safe zone */
        }}
      >
        <div style={{
          color: 'rgba(255,120,120,0.7)',
          fontSize: 13,
          fontWeight: 'bold',
          textAlign: 'center',
          lineHeight: 1.4,
          pointerEvents: 'none',
        }}>
          ⚔️<br/>
          <span style={{ fontSize: 10 }}>탭: 공격<br/>스와이프: 스윙</span>
        </div>
      </div>
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: `${color}33`,
    border: `2px solid ${color}99`,
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
    cursor: 'pointer',
    touchAction: 'none',
    lineHeight: 1.2,
    boxShadow: `0 0 10px ${color}44`,
  };
}
