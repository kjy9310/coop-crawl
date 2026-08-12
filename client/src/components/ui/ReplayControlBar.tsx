import React from 'react';
import { useGameStore } from '../../store/gameStore';

interface ReplayControlBarProps {
  replayIndex: number;
  setReplayIndex: (index: number) => void;
  replayBuffer: any[];
  isPlayingReplay: boolean;
  setIsPlayingReplay: (playing: boolean) => void;
  replaySpeed: number;
  setReplaySpeed: (speed: number) => void;
  onExitReplay: () => void;
}

export const ReplayControlBar: React.FC<ReplayControlBarProps> = ({
  replayIndex,
  setReplayIndex,
  replayBuffer,
  isPlayingReplay,
  setIsPlayingReplay,
  replaySpeed,
  setReplaySpeed,
  onExitReplay
}) => {
  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      background: 'rgba(0,0,0,0.85)',
      padding: '12px 24px',
      borderRadius: '10px',
      border: '2px solid #00cc66',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      color: 'white',
      width: '600px',
      boxShadow: '0 0 20px rgba(0, 204, 102, 0.4)'
    }}>
      <button 
        onClick={() => setIsPlayingReplay(!isPlayingReplay)}
        style={{ background: isPlayingReplay ? '#ff8800' : '#00cc66', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        {isPlayingReplay ? 'Pause ⏸' : 'Play ▶'}
      </button>

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
        style={{ flex: 1, cursor: 'pointer' }}
      />

      <span style={{ fontSize: '12px', fontWeight: 'bold', minWidth: '70px', textAlign: 'center' }}>
        {replayIndex} / {replayBuffer.length - 1}
      </span>

      <select 
        value={replaySpeed} 
        onChange={(e) => setReplaySpeed(parseFloat(e.target.value))}
        style={{ background: '#222', color: 'white', border: '1px solid #555', borderRadius: '4px', padding: '4px 8px', fontSize: '12px' }}
      >
        <option value={0.5}>0.5x</option>
        <option value={1}>1.0x</option>
        <option value={2}>2.0x</option>
      </select>

      <button 
        onClick={onExitReplay}
        style={{ background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        Exit Replay
      </button>
    </div>
  );
};
