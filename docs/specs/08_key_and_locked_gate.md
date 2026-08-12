# 08. Key & Locked Gate System Specification

## Overview
Defines the Dungeon Key exploration mechanic, Locked Goal Gate state machine, and Directional Beacon guidance system.

## State Machine (`IsGoalLocked`)
- `WorldState.IsGoalLocked` defaults to `true` upon dungeon map generation.
- While `IsGoalLocked == true`:
  - `GoalZone` renders a **Red Locked Shield/Aura**.
  - Players stepping into the Goal Zone cannot trigger `reachedGoal = true` or stage completion.
- When any player picks up an item with `Type == "key"`:
  - `WorldState.IsGoalLocked` is set to `false`.
  - `GoalZone` transitions to a **Golden Unlocked Aura**.
  - A **Directional Beacon Arrow** appears at player feet pointing toward the Goal Zone.
  - Players stepping into the Goal Zone can complete the stage.

## Item Schema: Dungeon Key
```json
{
  "id": "dungeon_key",
  "name": "Dungeon Key",
  "type": "key",
  "handType": "any",
  "position": { "x": 25.5, "y": 0.5, "z": 40.5 }
}
```

## Directional Beacon Specification
- When `IsGoalLocked == false`, a 3D compass ring/arrow is rendered under the player.
- Heading angle: `atan2(goal.x - player.x, goal.z - player.z)`.
- Color: Emissive Gold (`#ffcc00`), opacity: `0.75`.

## BDD Scenarios

### Scenario: Stepping in Goal Zone while Locked
- **Given** a WorldState with `IsGoalLocked = true` and a Player at `Position = GoalPoint`
- **When** `simulator.Tick()` runs
- **Then** `Player.ReachedGoal` remains `false`, and stage win is not triggered.

### Scenario: Picking up Dungeon Key
- **Given** a WorldState with `IsGoalLocked = true` and a Key item on the ground
- **When** a Player executes `handlePickup` on the Key item
- **Then** `WorldState.IsGoalLocked` changes to `false`, and goal entrance is enabled.
