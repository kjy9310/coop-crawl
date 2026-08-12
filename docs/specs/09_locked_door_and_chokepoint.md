# 09. Locked Door & Goal Room Chokepoint Specification

## Overview
Defines the Goal Room single-entrance topology, the locked Door entity, and the Key consumption door opening mechanism.

## Goal Room Single-Entrance Topology
- The Goal Room (Exit Room, index `len(rooms)-1`) is generated as a **Dead-End Room** with **exactly 1 entrance corridor**.
- A `Door` entity (`ID: "goal_door"`) is placed at the doorway threshold of this single entrance.

## Door Entity Schema
```json
{
  "id": "goal_door",
  "isLocked": true,
  "position": { "x": 45.0, "y": 1.0, "z": 50.0 },
  "size": { "x": 3.0, "y": 2.5, "z": 0.6 }
}
```

## Key Consumption & Door Unlocking Rules
- A locked door (`isLocked == true`) acts as a physical wall collision obstacle blocking movement and Line of Sight into the Goal Room.
- **Unlocking Mechanism**:
  - When a player holding a `Type == "key"` item approaches within `2.5` meters of a locked `Door` and executes pickup/interaction:
    1. The `Door.IsLocked` state is set to `false` (door opens/removes collision).
    2. The `Key` item is **consumed** (deleted from player's hand/inventory).
    3. `WorldState.IsGoalLocked` is set to `false`.
    4. An unlock notification is broadcast to all clients.

## BDD Scenarios

### Scenario: Movement Blocked by Locked Door
- **Given** a Locked Door (`IsLocked = true`) at the Goal Room entrance
- **When** a Player attempts to walk through the door threshold without a Key
- **Then** wall collision blocks the Player from entering the Goal Room.

### Scenario: Unlocking Door with Key
- **Given** a Player holding a Dungeon Key (`Type = "key"`) standing near a Locked Door
- **When** the Player executes interaction with the Door
- **Then** the Key is deleted from the Player's inventory/hand, the Door unlocks (`IsLocked = false`), `IsGoalLocked` becomes `false`, and the Player can enter the Goal Room.
