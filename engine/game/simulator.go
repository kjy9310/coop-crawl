package game

import (
	"fmt"
	"math"

	"github.com/mkgame2/engine/combat"
)

const (
	MoveSpeed      = 5.0  // Units per second
	EnemySpeed     = 3.0  // Units per second
	TickRate       = 30.0 // Ticks per second
	DeltaTime      = 1.0 / TickRate
	AttackRange    = 1.5
	AttackCooldown = 30 // Ticks (1 second)
)

// AllPlayersReachedGoal returns true if all non-dead players have reached the Goal Zone
func AllPlayersReachedGoal(state *WorldState) bool {
	if state.IsGoalLocked || len(state.Players) == 0 {
		return false
	}
	for _, player := range state.Players {
		if player.HP > 0 && !player.ReachedGoal {
			return false
		}
	}
	return true
}

// Tick advances the world state by one frame
func Tick(state *WorldState) {
	state.Tick++

	// 1. Spawner Logic
	processSpawners(state)

	// 2. Player Logic (Movement & Auto Attack)
	for id, player := range state.Players {
		if player.HP <= 0 {
			player.Velocity = Vector3{0, 0, 0}
			player.TargetPos = nil
			state.Players[id] = player
			continue
		}

		// MP Regeneration (+2 MP/sec => +0.067 per 30Hz tick)
		if player.MP < player.MaxMP {
			player.MP = math.Min(player.MaxMP, player.MP+0.067)
		}

		// Check Goal Zone Reach (Requires Gate to be Unlocked)
		if !state.IsGoalLocked && !player.ReachedGoal && (state.GoalPoint.X != 0 || state.GoalPoint.Z != 0) {
			if distance(player.Position, state.GoalPoint) <= 2.5 {
				player.ReachedGoal = true
			}
		}

		// Move based on TargetPos if exists
		if player.TargetPos != nil {
			dx := player.TargetPos.X - player.Position.X
			dz := player.TargetPos.Z - player.Position.Z
			dist := math.Sqrt(dx*dx + dz*dz)

			if dist < 0.2 {
				player.Velocity = Vector3{0, 0, 0}
				player.TargetPos = nil
			} else {
				player.Velocity = Vector3{
					X: (dx / dist) * MoveSpeed,
					Y: 0,
					Z: (dz / dist) * MoveSpeed,
				}
			}
		}

		// Apply velocity with sliding collision detection & physical weapon wall blocking
		radius := 0.4
		nextX := player.Position.X + player.Velocity.X*DeltaTime
		nextZ := player.Position.Z + player.Velocity.Z*DeltaTime

		isBlocked := func(p Vector3) bool {
			if checkCollision(p, radius, state.Walls) || checkDoorCollision(p, radius, state.Doors) {
				return true
			}
			if player.EquippedWeapon != nil && player.EquippedWeapon.Type == "melee" {
				return checkWeaponWallCollision(p, player.Heading, player.EquippedWeapon.Length, state.Walls)
			}
			return false
		}

		fullPos := Vector3{X: nextX, Y: player.Position.Y, Z: nextZ}
		xPos := Vector3{X: nextX, Y: player.Position.Y, Z: player.Position.Z}
		zPos := Vector3{X: player.Position.X, Y: player.Position.Y, Z: nextZ}

		// 1. Try full movement
		if !isBlocked(fullPos) {
			player.Position.X = nextX
			player.Position.Z = nextZ
		} else {
			// 2. Corner/Wall hit: Try X-only slide
			xAllowed := !isBlocked(xPos)
			// 3. Corner/Wall hit: Try Z-only slide
			zAllowed := !isBlocked(zPos)

			if xAllowed {
				player.Position.X = nextX
			} else {
				player.Velocity.X = 0
			}

			if zAllowed {
				player.Position.Z = nextZ
			} else {
				player.Velocity.Z = 0
			}

			if !xAllowed && !zAllowed {
				player.TargetPos = nil
			}
		}

		// Find nearest enemy to attack
		var nearestEnemy *EnemyState
		minDist := math.MaxFloat64

		for eId, enemy := range state.Enemies {
			dist := distance(player.Position, enemy.Position)
			if dist < minDist {
				minDist = dist
				e := state.Enemies[eId]
				nearestEnemy = &e
			}
		}

		// Player attacks Enemy if alive (Melee auto-attack fallback)
		if player.HP > 0 && nearestEnemy != nil && minDist <= AttackRange && state.Tick >= player.LastAtkTick+AttackCooldown {
			if player.EquippedWeapon == nil || player.EquippedWeapon.Type != "ranged" {
				dmg := combat.CalculateDamage(
					combat.Entity{Stats: player.Stats},
					combat.Entity{Stats: nearestEnemy.Stats},
					false,
				)
				nearestEnemy.HP -= dmg
				player.LastAtkTick = state.Tick

				if nearestEnemy.HP <= 0 {
					delete(state.Enemies, nearestEnemy.ID)
				} else {
					state.Enemies[nearestEnemy.ID] = *nearestEnemy
				}
			}
		}

		// Check Arrival at ExitPoint
		if state.ExitPoint.X != 0 || state.ExitPoint.Z != 0 {
			dx := player.Position.X - state.ExitPoint.X
			dz := player.Position.Z - state.ExitPoint.Z
			if (dx*dx + dz*dz) < 4.0 {
				fmt.Println("Player", id, "reached the ExitPoint!")
			}
		}

		state.Players[id] = player
	}

	// 3. Enemy Logic (AI Movement & Auto Attack)
	processEnemiesAI(state)

	// 4. Projectiles Logic
	processProjectiles(state)
}
