import React from 'react';
import { useGameStore } from '../../store/gameStore';

interface HUDProps {
  myId: string;
  isHost: boolean;
  started: boolean;
}

export const HUD = React.memo(({ myId, isHost, started }: HUDProps) => {
  const worldState = useGameStore(s => s.worldState);
  if (!started || !worldState) return null;

  const player = worldState.players[myId];
  if (!player) return null;

  const rightHand = player.equippedRightHand || player.equippedWeapon;
  const leftHand = player.equippedLeftHand;

  return (
    <>
      <div style={{ position: 'absolute', top: 10, right: 10, color: 'white' }}>
        Role: {isHost ? 'Host' : 'Client'} | Tick: {worldState.tick}
      </div>
      
      {/* Local Player HUD */}
      <div style={{ 
        position: 'absolute', 
        bottom: 30, 
        left: '50%', 
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.88)',
        padding: '12px 20px',
        borderRadius: '10px',
        border: '2px solid #555',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '18px',
        width: '580px',
        boxShadow: '0 0 20px rgba(0,0,0,0.7)'
      }}>
        {/* HP & MP Bars */}
        <div style={{ flex: '1 1 180px' }}>
          <div style={{ color: 'white', marginBottom: '2px', fontWeight: 'bold', fontSize: '12px' }}>
            HP: {Math.round(player.hp)} / {player.maxHp}
          </div>
          <div style={{ width: '100%', height: '12px', background: '#333', border: '1px solid black', marginBottom: '6px' }}>
            <div style={{ 
              width: `${Math.max(0, player.hp / player.maxHp) * 100}%`, 
              height: '100%', 
              background: (player.hp / player.maxHp) > 0.3 ? '#00ffcc' : '#ff0000',
              transition: 'width 0.2s'
            }} />
          </div>

          <div style={{ color: '#00ccff', marginBottom: '2px', fontWeight: 'bold', fontSize: '12px' }}>
            MP: {Math.round(player.mp || 100)} / {player.maxMp || 100}
          </div>
          <div style={{ width: '100%', height: '12px', background: '#333', border: '1px solid black' }}>
            <div style={{ 
              width: `${Math.max(0, (player.mp || 100) / (player.maxMp || 100)) * 100}%`, 
              height: '100%', 
              background: '#00aaff',
              transition: 'width 0.2s'
            }} />
          </div>
        </div>
        
        {/* Dual Hand Equipment Cards */}
        <div style={{ flex: '2 1 360px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          
          {/* Right Hand Slot Card */}
          <div style={{ padding: '6px 8px', background: '#333', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ color: '#aaa', fontSize: '10px', fontWeight: 'bold' }}>[RIGHT HAND]</span>
              <br/>
              {rightHand ? (
                <>
                  <span style={{ color: '#00ff00', fontWeight: 'bold' }}>{rightHand.name}</span>
                  <span style={{ fontSize: '10px', color: '#ccc', marginLeft: '6px' }}>
                    ({rightHand.handType || 'right'})
                  </span>
                </>
              ) : (
                <span style={{ color: '#888' }}>Unarmed (Melee)</span>
              )}
            </div>

            {/* Right Hand Skill Button */}
            {rightHand?.skillType ? (() => {
              const cdMax = rightHand.skillCooldown || 150;
              const mpCost = rightHand.skillMPCost || 30;
              const skillLabel = rightHand.skillName?.toUpperCase() || 'SKILL';

              const isCd = !!(player.lastSkillTick && (worldState.tick - player.lastSkillTick < cdMax));
              const progress = isCd ? Math.min(100, Math.max(0, ((cdMax - (worldState.tick - player.lastSkillTick!)) / cdMax) * 100)) : 0;
              const remainingSec = isCd ? ((cdMax - (worldState.tick - player.lastSkillTick!)) / 30).toFixed(1) : '';

              return (
                <div 
                  onClick={() => !isCd && window.dispatchEvent(new CustomEvent('requestSelfHeal'))}
                  title={`${rightHand.skillName || 'Skill'} (E) [-${mpCost} MP]`}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '4px',
                    background: isCd ? '#222' : '#00b359',
                    border: isCd ? '1.5px solid #666' : '1.5px solid #00ff88',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: isCd ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    userSelect: 'none',
                    flexShrink: 0
                  }}
                >
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
                  <span style={{ fontSize: '11px', fontWeight: 'bold', zIndex: 2, color: isCd ? '#aaa' : 'white' }}>E</span>
                  <span style={{ fontSize: '7px', fontWeight: 'bold', zIndex: 2, color: isCd ? '#00ff88' : '#aaffcc' }}>
                    {isCd ? `${remainingSec}s` : skillLabel}
                  </span>
                </div>
              );
            })() : (
              rightHand && (
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('requestDrop'))}
                  style={{ background: '#ff4444', color: 'white', border: 'none', borderRadius: '3px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Drop (G)
                </button>
              )
            )}
          </div>

          {/* Left Hand Slot Card (Light / Off-hand) */}
          <div style={{ padding: '6px 8px', background: '#333', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ color: '#aaa', fontSize: '10px', fontWeight: 'bold' }}>[LEFT HAND]</span>
              <br/>
              {leftHand ? (
                <>
                  <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>{leftHand.name}</span>
                  <span style={{ fontSize: '10px', color: '#ffaa33', marginLeft: '6px' }}>
                    💡 {leftHand.lightRadius || 6}m
                  </span>
                </>
              ) : (
                <span style={{ color: '#777' }}>Empty Hand</span>
              )}
            </div>
            {leftHand && (
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('requestDrop'))}
                style={{ background: '#ff8800', color: 'white', border: 'none', borderRadius: '3px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Drop (G)
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  );
});
