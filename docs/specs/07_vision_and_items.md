# 07. Vision, Light Sources & Hand Equipment Specification

## Overview
Defines the Fog of War vision system, dynamic light sources (Torches, Lanterns), and the Hand-Based Equipment Architecture.

## Equipment Hand Architecture (`HandType`)
Items specify an explicit `HandType` requirement:
- `"right"`: Right Hand / Main-hand weapon (Single-handed swords, Daggers).
- `"left"`: Left Hand / Off-hand equipment (Torches, Lanterns, Shields, Off-hand daggers).
- `"twoHanded"`: Occupies BOTH Right Hand and Left Hand (Greatswords, Staves, Bows).
- `"any"`: Can be equipped in either hand.

### Slot Rules:
- `PlayerState` possesses `EquippedRightHand *Item` and `EquippedLeftHand *Item`.
- **Equipping Two-Handed Weapon**: If a player picks up a `"twoHanded"` weapon, any item in `EquippedLeftHand` is automatically dropped or unequipped onto the ground.
- **Equipping Left-Hand Item**: If a player picks up a `"left"` item (e.g. Torch/Lantern) while holding a `"twoHanded"` weapon in `EquippedRightHand`, the two-handed weapon is unequipped to inventory/ground.

## Item Schema
```json
{
  "id": "torch_1",
  "name": "Dungeon Torch",
  "handType": "left",
  "type": "torch",
  "position": { "x": 10, "y": 0.5, "z": 10 },
  "lightRadius": 6.0,
  "lightColor": "#ff9933",
  "lightIntensity": 4.0
}
```

## Fog of War & Dynamic Lighting
- **Dark Dungeon Base Ambient**: Global ambient light intensity is set to `0.15` (Dark, atmospheric dungeon).
- **Base Player Vision**: A player without a light source has a minimal base vision radius of `3.0` meters.
- **Light Source Emission**:
  - **Torch**: Emits a warm orange glow (`#ff9933`) with a radius of `6.0` meters.
  - **Lantern**: Emits a bright amber glow (`#ffcc44`) with a radius of `10.0` meters.
- Dynamic 3D Point Lights are attached to active hand items in real-time, casting dynamic illumination over walls, floors, and nearby enemies.

## BDD Scenarios

### Scenario: Equipping Left-Hand Torch alongside One-Handed Dagger
- **Given** a Player holding a Dagger (`HandType: "right"`) in `EquippedRightHand`
- **When** the Player picks up a Torch (`HandType: "left"`)
- **Then** the Torch is equipped to `EquippedLeftHand`, the Dagger remains in `EquippedRightHand`, and a 6.0m warm light radius is attached to the Player.

### Scenario: Two-Handed Weapon Overwrite
- **Given** a Player holding a Torch in `EquippedLeftHand`
- **When** the Player picks up a Greatsword (`HandType: "twoHanded"`)
- **Then** the Torch in `EquippedLeftHand` is unequipped, and the Greatsword is equipped across both hands.
