# Specification: Replay & Goal Destination System

## Overview
The Replay & Goal Destination System captures frame snapshots of game execution in real-time. When a player reaches the designated Goal Zone, the session is saved and made available for instant playback with full controls (Play/Pause, Timeline Scrubber, Exit).

## Key Components

- **Goal Zone & All Players Completion**:
  - The map contains a designated Goal Zone at `GoalPoint` (e.g., `[18, 0, 18]`) rendered as a glowing golden beacon.
  - When a player moves within `2.5` units of the Goal Zone, their `ReachedGoal` is set to `true`.
  - **Match Win / Goal Reached Trigger**: Goal Completion and Replay Modal trigger ONLY when **ALL alive players in the session have reached the Goal Zone** (`ReachedGoal == true`).

## Event-Driven Deterministic Replay Architecture

The game uses a **Deterministic Event-Log Replay System**:
- Instead of capturing heavy 3D frame snapshots or clogging browser `localStorage`, the system records only the **Map Seed** and the **Input Event Stream** (`InputEvent[]` containing WASD movements, Aim angles, Attack, Pickup, Drop, and Join events).
- **Data Size**: ~30 KB per full match (ultra lightweight).
- **File Export & Server Ranking Ready**:
  - Upon reaching the Goal Zone, a structured Replay File payload is generated:
    ```json
    {
      "version": "1.0",
      "seed": 1723380000000,
      "totalTicks": 450,
      "timestamp": "2026-08-11T21:10:20Z",
      "events": [ ... ]
    }
    ```
  - Users can click **"💾 Download Replay (.json)"** to save the replay file directly to disk for future server leaderboard / ranking submission.
- **Playback Execution**:
  - Replay Mode re-initializes the Wasm Engine with the saved `seed`.
  - Frame-by-frame, playback applies logged events for that tick via `wasmApplyEvent()` and calls `wasmTick()`.

## BDD Scenarios

### Scenario: Event Log Deterministic Replay Verification
- **Given** an initial WorldState initialized with `seed = 12345` and an Event Log of 100 ticks
- **When** a secondary WorldState is initialized with `seed = 12345` and fed the exact Event Log frame-by-frame
- **Then** both WorldStates at tick 100 are 100% identical in all player positions, HP, MP, and item states.
- **Verification**: `replay_test.go` -> `TestReplay_EventDeterministicPlayback`.

### Scenario: Goal Zone Detection & Replay Save
- **Given** a Player 2.0 units away from the Goal Zone at `[18, 0, 18]`
- **When** the Player moves within 1.5 units of `[18, 0, 18]`
- **Then** `ReachedGoal` becomes `true`, gameplay recording is stopped and saved to `localStorage`, and the Goal Reached Replay prompt appears on screen.
- **Verification**: `replay_test.go` -> `TestReplay_GoalDetection`.
