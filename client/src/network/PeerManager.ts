import Peer from 'peerjs';

export class PeerManager {
  private peer: Peer;
  private connections: Map<string, any> = new Map();
  public peerId: string;
  public onStateUpdate: (state: any) => void = () => {};
  public onEvent: (event: any) => void = () => {};

  constructor(isHost: boolean, roomId: string) {
    this.peerId = isHost ? `host-${roomId}` : `client-${Math.random().toString(36).substr(2, 9)}`;
    
    // For MVP, we'll use PeerJS public cloud for easiest testing
    this.peer = new Peer(this.peerId);

    this.peer.on('open', (id) => {
      console.log('My peer ID is: ' + id);
      if (!isHost) {
        this.connectToHost(`host-${roomId}`);
      }
    });

    if (isHost) {
      this.peer.on('connection', (conn) => {
        this.connections.set(conn.peer, conn);
        
        conn.on('data', (data) => {
          // Host receives events from clients
          if (this.onEvent) {
            this.onEvent(JSON.stringify(data));
          } else if (window.wasmApplyEvent) {
             window.wasmApplyEvent(JSON.stringify(data));
          }
        });
      });
    }
  }

  connectToHost(hostId: string) {
    const conn = this.peer.connect(hostId, { reliable: false });
    
    conn.on('open', () => {
      console.log('Connected to host!');
      this.connections.set(hostId, conn);
      conn.send({ type: 'join', playerId: this.peerId, tick: 0 });
    });

    conn.on('data', (data: any) => {
      // Client receives state or events from host
      if (data && data.type) {
        this.onEvent(JSON.stringify(data));
      } else {
        this.onStateUpdate(data);
      }
    });
  }

  sendEvent(event: any) {
    // Send event to all connections (if client, it only has the host)
    this.connections.forEach((conn) => {
      conn.send(event);
    });
  }

  broadcastState(state: any) {
    // Host broadcasts state to all clients
    this.connections.forEach((conn) => {
      conn.send(state);
    });
  }
}
