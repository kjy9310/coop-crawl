package game

import (
	"math"
)

func processProjectiles(state *WorldState) {
	for pId, proj := range state.Projectiles {
		// Move
		dx := proj.Velocity.X * DeltaTime
		dz := proj.Velocity.Z * DeltaTime

		distMoved := math.Sqrt(dx*dx + dz*dz)
		proj.Distance += distMoved
		proj.Position.X += dx
		proj.Position.Z += dz

		if proj.Distance > proj.MaxRange {
			delete(state.Projectiles, pId)
			continue
		}

		// Check Wall Collision
		if checkCollision(proj.Position, 0.1, state.Walls) {
			delete(state.Projectiles, pId)
			continue
		}

		// Check Entity Collision
		hit := false

		// If Player fired it, check Enemies AND Teammate Players (for Healing)
		if _, isPlayer := state.Players[proj.OwnerID]; isPlayer {
			// 1. Check Enemies
			for eId, enemy := range state.Enemies {
				if distance(proj.Position, enemy.Position) < 0.8 {
					enemy.HP -= proj.Damage
					if enemy.HP <= 0 {
						delete(state.Enemies, eId)
					} else {
						state.Enemies[eId] = enemy
					}
					hit = true
					break
				}
			}

			// 2. Check Teammates (Co-op Healing)
			if !hit {
				for pId, player := range state.Players {
					if pId != proj.OwnerID && player.HP > 0 && distance(proj.Position, player.Position) < 0.8 {
						healAmount := proj.Damage
						if healAmount <= 0 {
							healAmount = 5.0
						}
						player.HP += healAmount
						if player.HP > player.MaxHP {
							player.HP = player.MaxHP
						}
						player.LastHealTick = state.Tick
						state.Players[pId] = player
						hit = true
						break
					}
				}
			}
		} else {
			// If Enemy fired it, check Players
			for pIdx, player := range state.Players {
				if player.HP > 0 && distance(proj.Position, player.Position) < 0.8 {
					player.HP -= proj.Damage
					state.Players[pIdx] = player
					hit = true
					break
				}
			}
		}

		if hit {
			delete(state.Projectiles, pId)
		} else {
			state.Projectiles[pId] = proj
		}
	}
}
