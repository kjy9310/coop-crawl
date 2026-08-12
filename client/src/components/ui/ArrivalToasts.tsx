import React from 'react';

interface ArrivalToastsProps {
  arrivals: string[];
}

export const ArrivalToasts: React.FC<ArrivalToastsProps> = ({ arrivals }) => {
  if (arrivals.length === 0) return null;

  return (
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
      {arrivals.map((name, i) => (
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
  );
};
