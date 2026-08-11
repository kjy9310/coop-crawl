# 01. Network & Event Specification

## Overview
A WebRTC P2P-based cooperative roguelike game. One player acts as the authoritative Host (running the Wasm game engine), and others connect as Clients.

## Protocol
- **Events (Client -> Host)**
  - `join`: Sent upon connecting. Contains unique `playerId`.
  - `move`: Contains target position or directional vector (`dir`).
  - `aim`: Contains `heading`, `angularSpeed`, and continuous `swingArc`.
  - `pickup`: Contains `itemId` of ground item to pick up.
  - `drop`: Triggers dropping equipped weapon onto ground.
  - `attack`: Triggers ranged attack firing projectile in `heading` direction.
- **State (Host -> Client)**
  - Broadcasts `WorldState` containing players, enemies, items, projectiles, spawners, and walls at 30Hz.

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
