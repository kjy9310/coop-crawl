# 02. Physics & Collision Specification

## Overview
Defines how characters (Players, Enemies) move and interact with static obstacles (Walls) within the game world.

## Structures
- **Wall (AABB)**: Defined by a center `Position` and `Size` (Width X, Height Y, Depth Z).
- **Character Collider**: All characters are treated as Circles with a radius of `0.5` units.

## Mechanics
- **Movement (WASD)**: Applied independently on X and Z axes per tick `Position += Velocity * DeltaTime`.
- **Sliding Mechanics**: Collision checks are performed per axis.
  - Move X -> Check AABB Collision & Physical Weapon Wall Block -> If blocked, reset X and set `Velocity.X = 0`.
  - Move Z -> Check AABB Collision & Physical Weapon Wall Block -> If blocked, reset Z and set `Velocity.Z = 0`.
  - This allows characters to naturally "slide" along walls when hitting them diagonally.
- **Physical Weapon & Rotation Wall Blocking**:
  - When equipped with a melee weapon, point-sampling (`checkWeaponWallCollision`) tests if the weapon blade intersects any wall.
  - **Movement Block**: Carrying a long weapon prevents walking through narrow gaps where the weapon hits the wall.
  - **Rotation Block**: If turning the character's heading causes the equipped weapon to collide with a wall, the rotation is blocked in place (`newHeading` rejected).

## BDD Scenarios

### Scenario: Diagonal Wall Sliding
- **Given** a Wall at `X=5` covering `X=4..6, Z=-5..5`
- **When** a player at `X=3, Z=0` moves diagonally right-and-down (Dir `[1, 0, 1]`)
- **Then** their X position is blocked at `X=3.5`, but their Z position continues to increase.
- **Verification**: `physics_test.go` -> `TestPhysics_WallCollision`

### Scenario: Melee Weapon Rotation Block
- **Given** a Player standing next to a Wall holding a Greatsword (`Length = 3.5`)
- **When** the Player tries to turn their heading (`EventAim`) towards the Wall
- **Then** the weapon collision is detected, and the rotation is blocked (`Heading` remains unchanged).
- **Verification**: `physics_test.go`
