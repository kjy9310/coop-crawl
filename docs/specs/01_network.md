# 01. Network & Event Specification

## WebRTC Signaling Architecture
- **Signaling Server**: Dedicated Node.js + Express + Socket.IO server running on port 3000 (`server/src/server.js`).
- **Signaling Events**:
  - `join-room`: Registers peer in target `roomId`.
  - `peer-connected`: Notifies existing room members when a new peer joins.
  - `webrtc-offer`: Relays RTCSessionDescription (offer) to target peer.
  - `webrtc-answer`: Relays RTCSessionDescription (answer) to target peer.
  - `ice-candidate`: Relays RTCIceCandidate to target peer.
- **P2P DataChannel Connection (`PeerManager`)**:
  - Uses native `RTCPeerConnection` with `RTCDataChannel` (label: `game-data`).
  - No external cloud dependencies (removes PeerJS dependency in favor of project signaling server).

## Game Event & State Protocol
- **Events (Client -> Host)**
  - `join`: Sent upon connecting. Contains unique `playerId` and optional `name`.
  - `move`: Contains target position or directional vector (`dir`).
  - `aim`: Contains `heading`, `angularSpeed`, and continuous `swingArc`.
  - `pickup`: Contains `itemId` of ground item to pick up.
  - `drop`: Triggers dropping equipped weapon onto ground.
  - `attack`: Triggers ranged attack firing projectile in `heading` direction.
- **State (Host -> Client)**
  - Broadcasts `WorldState` containing players, enemies, items, projectiles, spawners, and walls at 30Hz over WebRTC DataChannel.

## Engine Simulation (Determinism)
The Go engine runs at a fixed Tick Rate (30Hz).
- **Tick Lifecycle**:
  1. Process incoming events (Join, Move, Aim).
  2. Spawners generate enemies.
  3. **Physics**: Apply velocity on X and Z axes independently. Check AABB collisions and apply sliding if blocked.
  4. Prevent overshooting.
  5. **AI Vision**: Enemies raycast to nearby players to determine Line of Sight and FOV.
  6. Process AI targeting and movement.
  7. Process Combat.

## BDD Scenarios

### Scenario: Client Joining
- **Given** an empty WorldState
- **When** a `join` event is received with PlayerID "p1"
- **Then** a new PlayerState should be created for "p1" with full HP at the spawn position.
- **Player Character Name & Lobby Input**:
  - Before creating or joining a room, players enter a custom Character Name.
  - The player's name is broadcast via the `join` event (`Name` string field) and stored in `PlayerState.Name`.
  - The 3D view displays the Character Name above the player's overhead HP bar.

- **Deterministic Peer Synchronization**: `simulator_test.go`
