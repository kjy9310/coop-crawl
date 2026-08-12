package game

import (
	"fmt"
	"math"

	"github.com/mkgame2/engine/combat"
)

func processSpawners(state *WorldState) {
	for id, spawner := range state.Spawners {
		if len(state.Enemies) < 10 && state.Tick >= spawner.LastSpawn+spawner.Interval {
			enemyId := fmt.Sprintf("enemy_%d_%s", state.Tick, spawner.ID)

			// Randomly give some enemies a bow
			var weapon *Item = nil
			if (state.Tick % 2) == 0 {
				weapon = &Item{
					ID:              "bow_" + enemyId,
					Type:            "ranged",
					Name:            "Goblin Bow",
					Damage:          5,
					Range:           15,
					ProjectileSpeed: 10,
				}
			}

			state.Enemies[enemyId] = EnemyState{
				ID:             enemyId,
				Position:       spawner.Position,
				HP:             50,
				MaxHP:          50,
				Stats:          combat.Stats{Attack: 10, Defense: 2},
				EquippedWeapon: weapon,
			}
			spawner.LastSpawn = state.Tick
			state.Spawners[id] = spawner
		}
	}
}

func processEnemiesAI(state *WorldState) {
	for eId, enemy := range state.Enemies {
		var nearestPlayer *PlayerState
		var minDist float64 = math.MaxFloat64
		AggroRange := 8.0

		for _, p := range state.Players {
			if p.HP <= 0 {
				continue
			}

			d := distance(enemy.Position, p.Position)
			if d > AggroRange {
				continue // Too far
			}

			// Angle to player
			dx := p.Position.X - enemy.Position.X
			dz := p.Position.Z - enemy.Position.Z
			angleToPlayer := math.Atan2(dx, dz)

			// Difference in angles
			angleDiff := math.Abs(angleToPlayer - enemy.Heading)
			for angleDiff > math.Pi {
				angleDiff = math.Abs(angleDiff - 2*math.Pi)
			}

			if angleDiff > math.Pi/3 {
				continue // Outside of 120 degree FOV cone
			}

			// Line of sight check
			if !hasLineOfSight(enemy.Position, p.Position, state.Walls) {
				continue // Blocked by wall
			}

			if d < minDist {
				minDist = d
				temp := p
				nearestPlayer = &temp
			}
		}

		if nearestPlayer != nil {
			enemy.TargetID = nearestPlayer.ID
		} else {
			enemy.TargetID = ""
		}

		// Enemy AI: Move towards Target and Attack
		if enemy.TargetID != "" {
			if target, exists := state.Players[enemy.TargetID]; exists && target.HP > 0 {
				dist := distance(enemy.Position, target.Position)

				// Ranged Weapon AI
				if enemy.EquippedWeapon != nil && enemy.EquippedWeapon.Type == "ranged" {
					if dist < enemy.EquippedWeapon.Range {
						enemy.Velocity = Vector3{0, 0, 0}

						// Attack
						if state.Tick >= enemy.LastAtkTick+60 { // Enemy fire rate
							dx := target.Position.X - enemy.Position.X
							dz := target.Position.Z - enemy.Position.Z
							heading := math.Atan2(dx, dz)
							enemy.Heading = heading
							enemy.LastAtkTick = state.Tick

							projID := fmt.Sprintf("proj_%d_%s", state.Tick, enemy.ID)
							state.Projectiles[projID] = Projectile{
								ID:       projID,
								OwnerID:  enemy.ID,
								Type:     "arrow",
								Position: enemy.Position,
								Velocity: Vector3{
									X: math.Sin(heading) * enemy.EquippedWeapon.ProjectileSpeed,
									Y: 0,
									Z: math.Cos(heading) * enemy.EquippedWeapon.ProjectileSpeed,
								},
								Damage:   enemy.EquippedWeapon.Damage + enemy.Stats.Attack,
								Distance: 0,
								MaxRange: enemy.EquippedWeapon.Range,
							}
						}
					} else {
						// Move closer
						dx := target.Position.X - enemy.Position.X
						dz := target.Position.Z - enemy.Position.Z
						enemy.Heading = math.Atan2(dx, dz)
						enemy.Velocity = Vector3{
							X: (dx / dist) * EnemySpeed,
							Y: 0,
							Z: (dz / dist) * EnemySpeed,
						}
					}
				} else {
					// Melee AI
					if dist < AttackRange {
						enemy.Velocity = Vector3{0, 0, 0}
						if state.Tick >= enemy.LastAtkTick+AttackCooldown {
							dmg := combat.CalculateDamage(
								combat.Entity{Stats: enemy.Stats},
								combat.Entity{Stats: target.Stats},
								false,
							)
							target.HP -= dmg
							enemy.LastAtkTick = state.Tick
							state.Players[target.ID] = target
						}
					} else {
						dx := target.Position.X - enemy.Position.X
						dz := target.Position.Z - enemy.Position.Z
						enemy.Heading = math.Atan2(dx, dz)
						enemy.Velocity = Vector3{
							X: (dx / dist) * EnemySpeed,
							Y: 0,
							Z: (dz / dist) * EnemySpeed,
						}
					}
				}
			} else {
				enemy.TargetID = ""
				enemy.Velocity = Vector3{0, 0, 0}
			}
		} else {
			// No target, stop moving and look around (Idle)
			enemy.Velocity = Vector3{0, 0, 0}
			enemy.TargetID = ""

			// Rotate 90 degrees per second (math.Pi / 2.0 radians per 30 ticks)
			enemy.Heading += (math.Pi / 2.0) / 30.0

			// Normalize heading to [-Pi, Pi]
			for enemy.Heading > math.Pi {
				enemy.Heading -= 2 * math.Pi
			}
		}

		// Apply Velocity for Enemy (Corner & Diagonal safe)
		if enemy.Velocity.X != 0 || enemy.Velocity.Z != 0 {
			radius := 0.4
			nextX := enemy.Position.X + enemy.Velocity.X*DeltaTime
			nextZ := enemy.Position.Z + enemy.Velocity.Z*DeltaTime

			if !checkCollision(Vector3{X: nextX, Y: enemy.Position.Y, Z: nextZ}, radius, state.Walls) {
				enemy.Position.X = nextX
				enemy.Position.Z = nextZ
			} else {
				if !checkCollision(Vector3{X: nextX, Y: enemy.Position.Y, Z: enemy.Position.Z}, radius, state.Walls) {
					enemy.Position.X = nextX
				}
				if !checkCollision(Vector3{X: enemy.Position.X, Y: enemy.Position.Y, Z: nextZ}, radius, state.Walls) {
					enemy.Position.Z = nextZ
				}
			}
		}

		state.Enemies[eId] = enemy
	}
}
