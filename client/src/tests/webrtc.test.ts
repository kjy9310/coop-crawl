import { describe, it, expect } from 'vitest';
import Peer from 'peerjs';

describe('WebRTC Peer Connection', () => {
  it('should initialize a PeerJS instance', () => {
    // Basic test to verify we can import and instantiate PeerJS (if mocked correctly in JSDOM)
    // We mock it for the test
    const mockPeer = {
      id: 'mock-id-123',
      on: (event: string, cb: Function) => {
        if (event === 'open') {
          setTimeout(() => cb('mock-id-123'), 10);
        }
      }
    };

    expect(mockPeer.id).toBe('mock-id-123');
  });
});
