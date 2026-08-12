# 03. Combat Specification

## Overview
Defines how characters fight, calculate damage, and die.

## Mechanics
- **Auto-Attack**: Entities (Players and Enemies) automatically attack the nearest valid hostile target within `AttackRange` (1.5 units) if their `AttackCooldown` has elapsed (1 second / 30 Ticks).
- **Damage Formula**:
  - `Base Damage = Attack * (1 - Defense / (Defense + 100))`
  - *Note: Critical Hits are disabled for the MVP.*
- **Death**:
  - When an entity's HP reaches 0, they are considered dead.
  - Dead players stay in the world (as corpses) but have their `Velocity` and `TargetPos` immediately zeroed. They can no longer move or attack.
  - Dead enemies are immediately removed from the `WorldState`.

- **Core-Authoritative Projectile System**:
  - All projectile creation, movement, collision checks (wall AABB & entity radius), lifetime/range expiration, and damage/healing calculations are 100% managed by the Go Wasm Core Engine (`simulator.go`).
  - `Projectile` struct includes `Type string` (`"heal"`, `"magic"`, `"arrow"`) driven by the core engine.
  - Client rendering is strictly position-bound to core `WorldState.projectiles` with no client-side physics integration, eliminating speed desynchronization and visual glitches across different weapon/skill types.
  - All players possess `MP` (100) and `MaxMP` (100).
  - MP naturally regenerates at +2 MP per second (+0.067 MP per tick).
  - Displayed visually as a cyan/blue MP Bar below the HP Bar.

- **Weapon-Bound Skill Architecture**:
  - Active skills belong directly to individual equipped items (`Item` struct properties: `SkillName`, `SkillType`, `SkillMPCost`, `SkillCooldown`).
  - Weapons without a bound skill (`SkillType == ""`) cannot cast `E` key skills.
  - **Heal Staff (`starter_staff`) Bound Skill**:
    - `SkillName`: `"Sanctuary"`
    - `SkillType`: `"aoe_heal"`
    - `SkillMPCost`: `30`
    - `SkillCooldown`: `150` (ticks ~5 seconds)
    - **Effect**: Casts a 3.5-unit radius holy sanctuary burst healing caster and nearby teammates within 3.5m for **Damage × 2 (+10 HP)**.
    - **Visual Effects**:
      - **Skill Caster (`lastSkillCastTick`)**: Triggers a large 3.5m expanding Green Holy Dome Aura around the caster.
      - **Heal Receiver (`lastHealTick`)**: Triggers a compact 1.0m personal green ring rising tightly around the healed player.
  - **Equipment & Skill UI**:
    - Displays 3 core stats: `Dmg`, `Range`, and `Speed`.
    - Dynamically renders a **Square Skill Button [E]** embedded **INSIDE the Equipment Info DIV card** if the equipped weapon has a bound skill (`skillType != ""`), displaying hotkey `E`, `SkillMPCost`, and a dark vertical overlay indicating remaining cooldown progress.

## BDD Scenarios

### Scenario: Player Death
- **Given** a Player with `HP = 10`
- **When** an Enemy attacks the Player causing 15 damage
- **Then** the Player's HP becomes 0, and their Velocity is set to `[0,0,0]`.
- **Verification**: `combat_test.go` (Damage logic), `physics_test.go` (Dead player freezing).

### Scenario: Item Pickup and Drop (Co-op Sharing)
- **Given** a Player and a Ground Item ("Heal Staff")
- **When** the Player triggers `EventPickup` within 2.0 units
- **Then** the item moves to `EquippedWeapon`, and disappears from ground `state.Items`.
- **When** the Player triggers `EventDrop` (or presses `G`)
- **Then** `EquippedWeapon` becomes `nil`, and a new Ground Item is spawned 1 unit in front of the Player.
- **Verification**: `item_test.go`.

### Scenario: Heal Staff Teammate Healing
- **Given** a Player 1 holding a Heal Staff (`Damage = 5`) and Player 2 (Teammate) with `HP = 50` / `MaxHP = 100`
- **When** Player 1 fires a Heal Staff magic projectile at Player 2
- **Then** Player 2's HP is restored by +5 to `55` (equal to weapon Damage), and the projectile is consumed.
- **Verification**: `heal_test.go` -> `TestCombat_HealStaffTeammate`.

### Scenario: AOE Healing Skill (Damage x2) & MP Deduction
- **Given** Player 1 holding Heal Staff (`Damage = 5`) with `HP = 40`, `MP = 100`, Player 2 (Teammate 2.0m away) with `HP = 50`, Player 3 (Teammate 6.0m away) with `HP = 50`
- **When** Player 1 triggers AOE Healing Skill (`EventAttack` with `IsSelfCast: true` via `E` key)
- **Then** 30 MP is deducted from Player 1 (`MP = 70`), Player 1 is healed +10 (Damage × 2) to `50 HP`, Player 2 (nearby) is healed +10 to `60 HP`, and Player 3 (distant) remains at `50 HP`.
- **Verification**: `heal_test.go` -> `TestCombat_AOEHealingSkillAndMP`.
