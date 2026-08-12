import React from 'react';

interface GoalModalProps {
  onWatchReplay: () => void;
  onExportReplay: () => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  onWatchReplay,
  onExportReplay
}) => {
  return (
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
          onClick={onWatchReplay}
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
          onClick={onExportReplay}
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
          💾 Download Replay (.json)
        </button>
      </div>
    </div>
  );
};
