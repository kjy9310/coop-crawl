# Procedural Map Generation (ProcGen)

## Overview
The engine generates dynamic, randomized dungeons using a Seed-based Binary Space Partitioning (BSP) algorithm. This ensures that the generated maps are deterministic (the same seed always produces the same dungeon layout and enemy placements).

## 1. Generation Parameters
- **Seed**: An `int64` value used to initialize the pseudo-random number generator (PRNG).
- **Width & Depth**: The total dimensions of the dungeon grid (e.g., 50x50).
- **Difficulty**: Determines the number of enemies placed and their stats.

## 2. BSP Algorithm
1. **Partitioning**: The initial space (Width x Depth) is recursively divided into two smaller rectangles (either horizontally or vertically) until the rectangles reach a minimum size (e.g., 10x10).
2. **Room Creation**: Inside each leaf node (the smallest partitioned rectangles), a Room is created with a random width and depth, ensuring it fits inside the node with at least 1 unit of padding from the edges.
3. **Corridors**: Sibling nodes are connected by a corridor. The corridor starts from the center of one room and ends at the center of the other room, creating an L-shaped path.

## 3. Wall (AABB) Extraction
Instead of creating a `Wall` struct for every single 1x1 blocking tile, the generator extracts large AABB boundaries:
- The entire map boundary is enclosed in 4 massive outer walls.
- The empty spaces (where there are no rooms or corridors) are merged into the largest possible rectangles (Greedy Meshing) to minimize physics collision checks.

## 4. Pre-spawned Enemies
- Enemies are spawned at `Tick 0` instead of using a `Spawner`.
- For each generated room, there is a chance to spawn one or more enemies.
- The enemies are placed at random free coordinates within the room.
- Their `Heading` is randomized.

## BDD Scenarios

### Scenario: Deterministic Generation
- **Given** a Map Generator initialized with Seed `12345`
- **When** generating the map
- **Then** the exact number of rooms, walls, and enemies must match when generated again with Seed `12345`.

### Scenario: Bounded Generation
- **Given** a Map Generator initialized with dimensions `50x50`
- **When** generating the map
- **Then** all generated `Wall` positions and sizes must fall within the bounds of `0 <= X <= 50` and `0 <= Z <= 50`.
