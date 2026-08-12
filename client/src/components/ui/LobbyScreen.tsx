import React from 'react';

interface LobbyScreenProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  roomId: string;
  setRoomId: (id: string) => void;
  onStartGame: (host: boolean) => void;
  onLoadReplayFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  playerName,
  setPlayerName,
  roomId,
  setRoomId,
  onStartGame,
  onLoadReplayFile
}) => {
  return (
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
          onClick={() => onStartGame(true)} 
          style={{ flex: 1, padding: '10px', background: '#00cc66', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
        >
          Create Room (Host)
        </button>
        <button 
          onClick={() => onStartGame(false)} 
          style={{ flex: 1, padding: '10px', background: '#0088ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
        >
          Join Room (Client)
        </button>
      </div>
      <label style={{
        display: 'block',
        textAlign: 'center',
        padding: '8px',
        background: '#444',
        color: '#ffcc00',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '12px',
        marginTop: '5px',
        border: '1px dashed #ffcc00'
      }}>
        📂 Load Replay File (.json)
        <input type="file" accept=".json" onChange={onLoadReplayFile} style={{ display: 'none' }} />
      </label>
    </div>
  );
};
