package game

import (
	"fmt"
	"math"

	"github.com/mkgame2/engine/combat"
)

// ApplyEvent mutates the WorldState based on the given InputEvent
func ApplyEvent(state *WorldState, event InputEvent) {
	switch event.Type {
	case EventJoin:
		handleJoin(state, event)
	case EventAim:
		handleAim(state, event)
	case EventMove:
		handleMove(state, event)
	case EventPickup:
		handlePickup(state, event)
	case EventDrop:
		handleDrop(state, event)
	case EventAttack:
		handleAttack(state, event)
	}
}

func handleJoin(state *WorldState, event InputEvent) {
	if _, exists := state.Players[event.PlayerID]; !exists {
		name := "Player"
		if event.Name != nil && *event.Name != "" {
			name = *event.Name
		}
		state.Players[event.PlayerID] = PlayerState{
			ID:       event.PlayerID,
			Name:     name,
			Position: state.SpawnPoint,
			Velocity: Vector3{0, 0, 0},
			HP:       100,
			MaxHP:    100,
			MP:       100,
			MaxMP:    100,
			Stats:    combat.Stats{Attack: 20, Defense: 5, CriticalRate: 0.1, CriticalDamage: 1.5},
		}
	}
}

func handleAim(state *WorldState, event InputEvent) {
	if player, exists := state.Players[event.PlayerID]; exists && player.HP > 0 {
		if event.Heading != nil {
			targetHeading := *event.Heading

			// Continuous Sweep Rotation Collision Check for Melee Weapon
			if player.EquippedWeapon != nil && player.EquippedWeapon.Type == "melee" {
				weaponLen := player.EquippedWeapon.Length
				if weaponLen <= 0 {
					weaponLen = 2.0
				}

				angleDiff := targetHeading - player.Heading
				for angleDiff < -math.Pi {
					angleDiff += 2 * math.Pi
				}
				for angleDiff > math.Pi {
					angleDiff -= 2 * math.Pi
				}

				stepAngle := 0.08 // ~4.5 degrees per step
				steps := int(math.Ceil(math.Abs(angleDiff) / stepAngle))
				if steps < 1 {
					steps = 1
				}

				validHeading := player.Heading
				stepDir := 1.0
				if angleDiff < 0 {
					stepDir = -1.0
				}

				for i := 1; i <= steps; i++ {
					testAngle := player.Heading + stepDir*float64(i)*(math.Abs(angleDiff)/float64(steps))
					if checkWeaponWallCollision(player.Position, testAngle, weaponLen, state.Walls) {
						// Hit wall along sweep path! Stop rotation at last valid heading!
						break
					}
					validHeading = testAngle
				}

				player.Heading = validHeading
			} else {
				player.Heading = targetHeading
			}

			// Dynamic Melee Swing Physics Attack
			if player.EquippedWeapon != nil && player.EquippedWeapon.Type == "melee" && event.AngularSpeed != nil {
				minSpeed := player.EquippedWeapon.MinSwingSpeed
				if minSpeed <= 0 {
					minSpeed = 7.0 // Default min angular speed rad/s
				}

				minArc := math.Pi / 3.0 // Minimum 60 degrees continuous swing arc requirement
				hasEnoughArc := event.SwingArc == nil || *event.SwingArc >= minArc

				if math.Abs(*event.AngularSpeed) >= minSpeed && hasEnoughArc && state.Tick >= player.LastAtkTick+8 {
					player.LastSwingTick = state.Tick
					weaponLen := player.EquippedWeapon.Length
					if weaponLen <= 0 {
						weaponLen = 2.0 // Default length
					}

					// Calculate weapon tip position
					tip := Vector3{
						X: player.Position.X + math.Sin(player.Heading)*weaponLen,
						Y: player.Position.Y,
						Z: player.Position.Z + math.Cos(player.Heading)*weaponLen,
					}

					// Check Wall Deflection: Only hit enemies if weapon is NOT hitting a wall!
					if !checkWeaponWallCollision(player.Position, player.Heading, weaponLen, state.Walls) {
						// Check hits on enemies
						hitAny := false
						for eId, enemy := range state.Enemies {
							if lineCircleIntersect(player.Position, tip, enemy.Position, 0.8) {
								dmg := combat.CalculateDamage(
									combat.Entity{Stats: player.Stats},
									combat.Entity{Stats: enemy.Stats},
									false,
								)
								if player.EquippedWeapon.Damage > 0 {
									dmg += player.EquippedWeapon.Damage
								}
								enemy.HP -= dmg
								hitAny = true

								if enemy.HP <= 0 {
									delete(state.Enemies, eId)
								} else {
									state.Enemies[eId] = enemy
								}
							}
						}

						if hitAny {
							player.LastAtkTick = state.Tick
						}
					}
				}
			}

			state.Players[event.PlayerID] = player
		}
	}
}

func handleMove(state *WorldState, event InputEvent) {
	if player, exists := state.Players[event.PlayerID]; exists && player.HP > 0 {
		if event.Dir != nil {
			// WASD directional movement
			player.TargetPos = nil
			player.Velocity = Vector3{
				X: event.Dir.X * MoveSpeed,
				Y: 0,
				Z: event.Dir.Z * MoveSpeed,
			}
		} else if event.TargetPos != nil {
			// Point and click movement
			player.TargetPos = event.TargetPos
		}
		state.Players[event.PlayerID] = player
	}
}

func handlePickup(state *WorldState, event InputEvent) {
	if player, exists := state.Players[event.PlayerID]; exists && player.HP > 0 {
		// 1. Check Door Interaction / Unlocking
		for doorID, door := range state.Doors {
			if door.IsLocked && distance(player.Position, door.Position) < 2.5 {
				hasKey := false
				if player.EquippedRightHand != nil && player.EquippedRightHand.Type == "key" {
					player.EquippedRightHand = nil
					player.EquippedWeapon = nil
					hasKey = true
				} else if player.EquippedLeftHand != nil && player.EquippedLeftHand.Type == "key" {
					player.EquippedLeftHand = nil
					hasKey = true
				} else {
					newInv := []Item{}
					for _, invItem := range player.Inventory {
						if !hasKey && invItem.Type == "key" {
							hasKey = true
						} else {
							newInv = append(newInv, invItem)
						}
					}
					player.Inventory = newInv
				}

				if hasKey {
					door.IsLocked = false
					state.Doors[doorID] = door
					state.IsGoalLocked = false
					state.Players[event.PlayerID] = player
					return
				}
			}
		}

		// 2. Item Ground Pickup
		if event.ItemID != nil {
			if item, itemExists := state.Items[*event.ItemID]; itemExists {
				if distance(player.Position, item.Position) < 2.5 {
					player.Inventory = append(player.Inventory, item)

					dropItem := func(oldItem *Item) {
						if oldItem == nil {
							return
						}
						dropped := *oldItem
						dropped.ID = fmt.Sprintf("item_drop_%d_%s_%s", state.Tick, player.ID, oldItem.ID)
						dropped.Position = Vector3{
							X: player.Position.X + math.Sin(player.Heading)*0.8,
							Y: 0.5,
							Z: player.Position.Z + math.Cos(player.Heading)*0.8,
						}
						state.Items[dropped.ID] = dropped
					}

					// Auto-equip and swap logic based on HandType
					if item.HandType == HandLeft || item.Type == "torch" || item.Type == "lantern" {
						if player.EquippedLeftHand != nil {
							dropItem(player.EquippedLeftHand)
						}
						player.EquippedLeftHand = &item
						// If holding a Two-Handed weapon in Right Hand, drop/clear right hand
						if player.EquippedRightHand != nil && player.EquippedRightHand.HandType == HandTwoHanded {
							dropItem(player.EquippedRightHand)
							player.EquippedRightHand = nil
							player.EquippedWeapon = nil
						}
					} else if item.HandType == HandTwoHanded {
						if player.EquippedRightHand != nil {
							dropItem(player.EquippedRightHand)
						}
						if player.EquippedLeftHand != nil {
							dropItem(player.EquippedLeftHand)
							player.EquippedLeftHand = nil
						}
						player.EquippedRightHand = &item
						player.EquippedWeapon = &item
					} else {
						// Default Right Hand / Weapon
						if player.EquippedRightHand != nil {
							dropItem(player.EquippedRightHand)
						}
						player.EquippedRightHand = &item
						player.EquippedWeapon = &item
					}

					// Ensure EquippedWeapon helper syncs with EquippedRightHand
					if player.EquippedRightHand != nil {
						player.EquippedWeapon = player.EquippedRightHand
					} else {
						player.EquippedWeapon = nil
					}

					// Key Pickup Gate Unlock
					if item.Type == "key" {
						state.IsGoalLocked = false
					}

					state.Players[event.PlayerID] = player
					delete(state.Items, *event.ItemID)
				}
			}
		}
	}
}

func handleDrop(state *WorldState, event InputEvent) {
	if player, exists := state.Players[event.PlayerID]; exists && player.HP > 0 {
		var droppedItem *Item = nil

		if player.EquippedLeftHand != nil {
			droppedItem = player.EquippedLeftHand
			player.EquippedLeftHand = nil
		} else if player.EquippedRightHand != nil {
			droppedItem = player.EquippedRightHand
			player.EquippedRightHand = nil
			player.EquippedWeapon = nil
		} else if player.EquippedWeapon != nil {
			droppedItem = player.EquippedWeapon
			player.EquippedWeapon = nil
		}

		if droppedItem != nil {
			itemCopy := *droppedItem
			itemCopy.ID = fmt.Sprintf("item_drop_%d_%s", state.Tick, player.ID)
			itemCopy.Position = Vector3{
				X: player.Position.X + math.Sin(player.Heading)*1.0,
				Y: 0.5,
				Z: player.Position.Z + math.Cos(player.Heading)*1.0,
			}
			state.Items[itemCopy.ID] = itemCopy
			state.Players[event.PlayerID] = player
		}
	}
}

func handleAttack(state *WorldState, event InputEvent) {
	if player, exists := state.Players[event.PlayerID]; exists && player.HP > 0 {
		if player.EquippedWeapon != nil && player.EquippedWeapon.Type == "ranged" {
			if player.LastAtkTick == 0 || state.Tick >= player.LastAtkTick+35 { // Cooldown (35 ticks ~ 1.17s)
				player.LastAtkTick = state.Tick

				// Check Weapon-Bound Skill Execution (IsSelfCast == true via E key)
				if event.IsSelfCast != nil && *event.IsSelfCast {
					if player.EquippedWeapon == nil || player.EquippedWeapon.SkillType == "" {
						return
					}

					mpCost := player.EquippedWeapon.SkillMPCost
					if mpCost <= 0 {
						mpCost = 30.0
					}
					cdTicks := player.EquippedWeapon.SkillCooldown
					if cdTicks <= 0 {
						cdTicks = 150
					}

					if player.MP < mpCost {
						return
					}
					if player.LastSkillTick > 0 && state.Tick < player.LastSkillTick+cdTicks {
						return
					}

					player.MP -= mpCost
					player.LastSkillTick = state.Tick
					player.LastHealTick = state.Tick
					player.LastSkillCastTick = state.Tick
					player.LastAtkTick = state.Tick

					switch player.EquippedWeapon.SkillType {
					case "aoe_heal":
						healRadius := 3.5
						healAmount := player.EquippedWeapon.Damage * 2.0
						if healAmount <= 0 {
							healAmount = 10.0
						}
						for pId, pTarget := range state.Players {
							if pTarget.HP > 0 && distance(player.Position, pTarget.Position) <= healRadius {
								pTarget.HP += healAmount
								if pTarget.HP > pTarget.MaxHP {
									pTarget.HP = pTarget.MaxHP
								}
								pTarget.LastHealTick = state.Tick
								state.Players[pId] = pTarget
								if pId == event.PlayerID {
									player.HP = pTarget.HP
								}
							}
						}
					}

					state.Players[event.PlayerID] = player
					return
				}

				// Standard Ranged Projectile
				if event.Heading != nil {
					player.Heading = *event.Heading
					state.Players[event.PlayerID] = player

					projID := fmt.Sprintf("proj_%d_%s", state.Tick, player.ID)
					speed := player.EquippedWeapon.ProjectileSpeed
					if speed <= 0 {
						speed = 10
					}

					maxRange := player.EquippedWeapon.Range
					if maxRange <= 0 {
						maxRange = 15
					}

					projType := "magic"
					if player.EquippedWeapon != nil {
						if player.EquippedWeapon.SkillType == "aoe_heal" || player.EquippedWeapon.Type == "staff" {
							projType = "heal"
						} else if player.EquippedWeapon.Type == "ranged" {
							projType = "arrow"
						}
					}

					state.Projectiles[projID] = Projectile{
						ID:       projID,
						OwnerID:  player.ID,
						Type:     projType,
						Position: player.Position,
						Velocity: Vector3{
							X: math.Sin(player.Heading) * speed,
							Y: 0,
							Z: math.Cos(player.Heading) * speed,
						},
						Damage:   player.EquippedWeapon.Damage,
						MaxRange: maxRange,
					}
				}
			}
		}
	}
}
